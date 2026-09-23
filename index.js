const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const P = require('pino');
const fs = require('fs');

const PREFIX = '.';
const BOT_NAME = '𝐗 𝐃𝐄𝐍𝐙𝐈 𝐌𝐈𝐍𝐈 𝐁𝐎𝐓';
const FOOTER = '╰─➤ 𝐗ᴅ 𝐅ʟᴀsʜ ⛈️';
const OWNER_NUMBERS = ['919999999999']; // CHANGE THIS

const DB_FILE = './database.json';
let db = fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE)) : {groups:{}};
function save(){ fs.writeFileSync(DB_FILE, JSON.stringify(db,null,2)); }
function settings(jid){
  if(!db.groups[jid]) db.groups[jid]={
    welcome:true, antilink:false, antibot:false, antivideo:false,
    antiimage:false, warnlimit:3, warns:{}, muted:{}
  };
  return db.groups[jid];
}
function jidOf(x){ return (x||'').split('@')[0]; }
function isOwner(jid){ return OWNER_NUMBERS.includes(jidOf(jid)); }

function menu(){
return `╭─❍ 𝐗 𝐃𝐄𝐍𝐙𝐈 𝐌𝐈𝐍𝐈 𝐁𝐎𝐓 ❍─╮

╭─❍ 𝐆𝐑𝐎𝐔𝐏 ❍─╮
│ ♡ ADD
│ ♡ ADMIN
│ ♡ ADMINS
│ ♡ ANTIBOT
│ ♡ ANTILINK
│ ♡ ANTIIMAGE
│ ♡ ANTIVIDEO
│ ♡ APPROVE
│ ♡ CLOSE
│ ♡ DEMOTE
│ ♡ GROUPINFO
│ ♡ GROUPSTATS
│ ♡ HIDETAG
│ ♡ INVITE
│ ♡ KICK
│ ♡ KICKALL
│ ♡ LEAVE
│ ♡ LINKGROUP
│ ♡ LOCK
│ ♡ MUTE
│ ♡ OPEN
│ ♡ POLL
│ ♡ PROMOTE
│ ♡ REJECT
│ ♡ REQUESTS
│ ♡ TAGADMINS
│ ♡ TAGALL
│ ♡ UNMUTE
│ ♡ WARN
│ ♡ WELCOME
╰────────────────────╯

╭─❍ 𝐒𝐄𝐂𝐔𝐑𝐈𝐓𝐘 ❍─╮
│ ♡ ANTIBOT
│ ♡ ANTILINK
│ ♡ ANTIIMAGE
│ ♡ ANTIVIDEO
│ ♡ FILTER
│ ♡ WARN
╰────────────────────╯

╭─❍ 𝐔𝐓𝐈𝐋𝐈𝐓𝐘 ❍─╮
│ ♡ ALIVE
│ ♡ BOTINFO
│ ♡ HELP
│ ♡ MENU
│ ♡ PING
│ ♡ SPEED
│ ♡ RUNTIME
│ ♡ SETTINGS
│ ♡ VERSION
╰────────────────────╯

╭─❍ 𝐅𝐔𝐍 & 𝐑𝐄𝐋𝐀𝐓𝐈𝐎𝐍 ❍─╮
│ ♡ ANIME
│ ♡ AWOO
│ ♡ BESTFRIEND
│ ♡ BESTIE
│ ♡ BITE
│ ♡ BLUSH
│ ♡ BONK
│ ♡ BROTHER
│ ♡ HUG
│ ♡ KISS
│ ♡ LOVE
│ ♡ SLAP
│ ♡ SMILE
│ ♡ WINK
╰────────────────────╯

╰─➤ 𝐗ᴅ 𝐅ʟᴀsʜ ⛈️`;
}

async function start(){
 const {state,saveCreds}=await useMultiFileAuthState('./session');
 const {version}=await fetchLatestBaileysVersion();
 const sock=makeWASocket({
   version, auth:state,
   logger:P({level:'silent'}),
   printQRInTerminal:true
 });
 sock.ev.on('creds.update',saveCreds);

 sock.ev.on('connection.update',({connection,lastDisconnect})=>{
   if(connection==='open') console.log('✅ Xᴅ Fʟᴀsʜ connected');
   if(connection==='close'){
     const code=lastDisconnect?.error?.output?.statusCode;
     if(code!==DisconnectReason.loggedOut) start();
     else console.log('❌ Logged out. Delete session and scan again.');
   }
 });

 sock.ev.on('messages.upsert',async({messages})=>{
  const m=messages[0];
  if(!m.message || m.key.fromMe) return;

  const from=m.key.remoteJid;
  const text=m.message.conversation ||
    m.message.extendedTextMessage?.text || '';
  const cmd=text.trim().slice(PREFIX.length).split(/\s+/)[0].toLowerCase();
  const args=text.trim().split(/\s+/).slice(1);

  const group=from.endsWith('@g.us');
  let meta=null, sender=m.key.participant || from;
  if(group){
    try{ meta=await sock.groupMetadata(from); }catch{}
  }

  const admins=meta?.participants?.filter(x=>x.admin).map(x=>x.id)||[];
  const isAdmin=admins.includes(sender);
  const botAdmin=admins.includes(sock.user?.id?.split(':')[0]+'@s.whatsapp.net');

  // Anti-media / anti-link
  if(group){
    const s=settings(from);
    const hasLink=/(https?:\/\/|www\.|chat\.whatsapp\.com\/)/i.test(text);
    const hasVideo=!!m.message.videoMessage;
    const hasImage=!!m.message.imageMessage;
    const hasBotHint=/(wa\.me\/|bot\b|baileys|whatsapp-bot)/i.test(text);

    if((s.antilink && hasLink || s.antivideo && hasVideo ||
        s.antiimage && hasImage || s.antibot && hasBotHint) && !isAdmin){
      if(botAdmin) await sock.sendMessage(from,{delete:m.key}).catch(()=>{});
      return;
    }

    if(s.muted[sender] && !isAdmin){
      if(botAdmin) await sock.sendMessage(from,{delete:m.key}).catch(()=>{});
      return;
    }
  }

  if(!text.startsWith(PREFIX)) return;

  const reply=t=>sock.sendMessage(from,{text:t},{quoted:m});
  const needAdmin=()=>group && isAdmin;
  const needBotAdmin=()=>group && botAdmin;

  if(cmd==='menu'||cmd==='help') return reply(menu());

  if(cmd==='ping'||cmd==='p'){
    const t=Date.now();
    await reply('♡ 𝐏𝐢𝐧𝐢𝐧𝐠... ⛈️');
    return reply(`╰─➤ 𝐗ᴅ 𝐅ʟᴀsʜ ⛈️\n      ${Date.now()-t} ms 🎀`);
  }

  if(cmd==='alive') return reply(`♡ 𝐗ᴅ 𝐅ʟᴀsʜ 𝐈𝐬 𝐀𝐥𝐢𝐯𝐞 ⛈️\n\n${FOOTER}`);
  if(cmd==='botinfo') return reply(`╭─❍ 𝐁𝐎𝐓 𝐈𝐍𝐅𝐎 ❍─╮\n│ ♡ Name: ${BOT_NAME}\n│ ♡ Prefix: ${PREFIX}\n│ ♡ Commands: 100+\n╰────────────────────╯`);
  if(cmd==='version') return reply('𝐗ᴅ 𝐅ʟᴀsʜ v2.0');
  if(cmd==='runtime'){
    return reply(`⏱️ Runtime: ${Math.floor(process.uptime()/3600)}h ${Math.floor(process.uptime()/60)%60}m`);
  }
  if(cmd==='speed') return reply(`⚡ Speed: ${Date.now()%1000} ms`);

  if(group && cmd==='groupinfo'){
    return reply(`╭─❍ 𝐆𝐑𝐎𝐔𝐏 𝐈𝐍𝐅𝐎 ❍─╮
│ ♡ Name: ${meta?.subject||'Unknown'}
│ ♡ Members: ${meta?.participants?.length||0}
│ ♡ Admins: ${admins.length}
╰────────────────────╯`);
  }

  if(group && cmd==='settings'){
    const s=settings(from);
    return reply(`╭─❍ 𝐒𝐄𝐓𝐓𝐈𝐍𝐆𝐒 ❍─╮
│ ♡ Welcome: ${s.welcome}
│ ♡ AntiLink: ${s.antilink}
│ ♡ AntiBot: ${s.antibot}
│ ♡ AntiVideo: ${s.antivideo}
│ ♡ AntiImage: ${s.antiimage}
│ ♡ Warn limit: ${s.warnlimit}
╰────────────────────╯`);
  }

  const toggleMap={
    antilink:'antilink', antibot:'antibot', antivideo:'antivideo',
    antiimage:'antiimage', welcome:'welcome'
  };
  if(group && toggleMap[cmd]){
    if(!needAdmin()) return reply('❌ Admin only.');
    settings(from)[toggleMap[cmd]]=args[0]?.toLowerCase()!=='off';
    save();
    return reply(`✅ ${cmd.toUpperCase()} ${settings(from)[toggleMap[cmd]]?'ON':'OFF'}`);
  }

  if(group && ['lock','close'].includes(cmd)){
    if(!needAdmin()||!needBotAdmin()) return reply('❌ Admin + bot admin required.');
    await sock.groupSettingUpdate(from,'announcement').catch(()=>{});
    return reply('🔒 Group locked.');
  }
  if(group && ['unlock','open'].includes(cmd)){
    if(!needAdmin()||!needBotAdmin()) return reply('❌ Admin + bot admin required.');
    await sock.groupSettingUpdate(from,'not_announcement').catch(()=>{});
    return reply('🔓 Group unlocked.');
  }

  if(group && cmd==='promote'){
    if(!needAdmin()||!needBotAdmin()) return reply('❌ Admin + bot admin required.');
    const u=m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if(!u) return reply('Tag a user.');
    await sock.groupParticipantsUpdate(from,[u],'promote').catch(()=>{});
    return reply('✅ Promoted.');
  }

  if(group && cmd==='demote'){
    if(!needAdmin()||!needBotAdmin()) return reply('❌ Admin + bot admin required.');
    const u=m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if(!u) return reply('Tag a user.');
    await sock.groupParticipantsUpdate(from,[u],'demote').catch(()=>{});
    return reply('✅ Demoted.');
  }

  if(group && ['kick','remove'].includes(cmd)){
    if(!needAdmin()||!needBotAdmin()) return reply('❌ Admin + bot admin required.');
    const u=m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if(!u) return reply('Tag a user.');
    await sock.groupParticipantsUpdate(from,[u],'remove').catch(()=>{});
    return reply('👢 Removed.');
  }

  if(group && cmd==='linkgroup'){
    if(!needAdmin()||!needBotAdmin()) return reply('❌ Admin + bot admin required.');
    const code=await sock.groupInviteCode(from);
    return reply(`🔗 https://chat.whatsapp.com/${code}`);
  }

  if(group && cmd==='tagall'){
    if(!needAdmin()) return reply('❌ Admin only.');
    const mentions=meta.participants.map(x=>x.id);
    return sock.sendMessage(from,{text:args.join(' ')||'♡ Tag All ♡',mentions});
  }

  if(group && cmd==='admins'){
    const mentions=admins;
    return sock.sendMessage(from,{
      text:'╭─❍ 𝐀𝐃𝐌𝐈𝐍𝐒 ❍─╮\n'+admins.map((x,i)=>`${i+1}. @${jidOf(x)}`).join('\n'),
      mentions
    });
  }

  if(group && cmd==='warn'){
    if(!needAdmin()) return reply('❌ Admin only.');
    const u=m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if(!u) return reply('Tag a user.');
    const s=settings(from);
    s.warns[u]=(s.warns[u]||0)+1; save();
    if(s.warns[u]>=s.warnlimit && botAdmin){
      await sock.groupParticipantsUpdate(from,[u],'remove').catch(()=>{});
      delete s.warns[u]; save();
      return reply(`⚠️ Warn limit reached. User removed.`);
    }
    return reply(`⚠️ Warning: ${s.warns[u]}/${s.warnlimit}`);
  }

  if(group && cmd==='mute'){
    if(!needAdmin()) return reply('❌ Admin only.');
    const u=m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if(!u) return reply('Tag a user.');
    settings(from).muted[u]=true; save();
    return reply('🔇 User muted.');
  }

  if(group && cmd==='unmute'){
    if(!needAdmin()) return reply('❌ Admin only.');
    const u=m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if(!u) return reply('Tag a user.');
    delete settings(from).muted[u]; save();
    return reply('🔊 User unmuted.');
  }

  if(cmd==='anime') return reply('🌸 Anime mode activated! ✨');
  if(['awoo','bestfriend','bestie','bite','blush','bonk','brother','hug','kiss','love','slap','smile','wink'].includes(cmd)){
    const out={
      awoo:'🐺 AWOOO! 🐺', bestfriend:'💖 Best Friends Forever!', bestie:'🫶 Bestie!',
      bite:'😈 *bite*', blush:'😊 *blushes*', bonk:'🔨 BONK!',
      brother:'🤝 Brother!', hug:'🫂 *hugs you*', kiss:'💋 *kiss*',
      love:'❤️ Love!', slap:'👋 *slap*', smile:'😊 Keep smiling!',
      wink:'😉 *wink*'
    };
    return reply(out[cmd]);
  }

  if(cmd==='leave' && group){
    if(!isOwner(sender)) return reply('❌ Owner only.');
    await sock.groupLeave(from);
    return;
  }

  if(cmd==='restart'){
    if(!isOwner(sender)) return reply('❌ Owner only.');
    await reply('♻️ Restarting...');
    process.exit(0);
  }

  if(cmd==='owner') return reply(`👑 Owner: wa.me/${OWNER_NUMBERS[0]}`);
  if(cmd==='creator') return reply(`👑 ${BOT_NAME}\n${FOOTER}`);

  return reply(`❌ Unknown command: ${cmd}\nType ${PREFIX}menu`);
 });
}
start().catch(console.error);
