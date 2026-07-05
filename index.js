require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes, SlashCommandBuilder } = require('discord.js');
const fs = require('fs');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

// ============================================================
// ✅ KONFIGURASI - Ambil dari file .env
// ============================================================
const BOT_TOKEN        = process.env.BOT_TOKEN;
const CHANNEL_ID_SAMBUT = process.env.CHANNEL_ID_SAMBUT;
const CHANNEL_ID_LOG   = process.env.CHANNEL_ID_LOG;
const CHANNEL_ID_RULES = process.env.CHANNEL_ID_RULES;

// ============================================================
// DATA & PENYIMPANAN
// ============================================================
const quotes = [
    "Hidup itu seperti bersepeda. Kalau mau menjaga keseimbangan, kamu harus terus bergerak.",
    "Jangan menunggu waktu yang tepat, ciptakanlah waktu yang tepat.",
    "Kesuksesan bukanlah akhir, kegagalan bukanlah bencana: keberanian untuk melanjutkanlah yang terpenting.",
    "Setiap hari adalah kesempatan baru untuk menjadi lebih baik dari kemarin.",
    "Jangan bandingkan perjalananmu dengan orang lain. Bunga tidak mekar secara bersamaan.",
    "Kerja keras akan menggantikan bakat ketika bakat tidak bekerja keras.",
    "Bahagia bukan karena memiliki segalanya, tapi karena mensyukuri apa yang dimiliki.",
    "Mimpi tidak akan menjadi kenyataan lewat sihir, ia butuh keringat, tekad, dan kerja keras.",
    "Hari ini adalah hari terbaik untuk memulai hal baru.",
    "Kegagalan adalah guru terbaik, pelajari pelajarannya dan terus maju.",
    "Tidak masalah seberapa lambatnya kamu berjalan selama kamu tidak berhenti.",
    "Hiduplah seolah-olah kamu akan mati besok. Belajarlah seolah-olah kamu akan hidup selamanya.",
    "Bermimpilah setinggi langit. Jika engkau jatuh, engkau akan jatuh di antara bintang-bintang.",
    "Kesuksesan adalah hasil dari ketekunan dan tekad yang tak pernah padam."
];

const daftarAfk    = new Map();
const daftarUndangan = new Map();
const FILE_DATA_TANAM = './data_tanam.json';

// ============================================================
// FUNGSI BACA/SIMPAN DATA
// ============================================================
function bacaDataTanam() {
    if (!fs.existsSync(FILE_DATA_TANAM)) return {};
    try { return JSON.parse(fs.readFileSync(FILE_DATA_TANAM, 'utf8')); }
    catch { return {}; }
}
function simpanDataTanam(data) {
    fs.writeFileSync(FILE_DATA_TANAM, JSON.stringify(data, null, 2), 'utf8');
}

// ============================================================
// FUNGSI UTAMA — TANAM / EDIT ATURAN
// ============================================================
async function tanamPesanRules(channel) {
    const dataTanam = bacaDataTanam();
    const kunci = `rules_${channel.guild.id}_${channel.id}`;

    // ✅ UBAH ISI ATURAN DI SINI
    const embedRules = new EmbedBuilder()
        .setColor('#4c00ff')
        .setTitle('📜 ATURAN SERVER PIXELHACHI')
        .setDescription(`
## ━━━━━━━━━━━━━━━━━━
## 📜 RULES SERVER & COMMUNITY
## ━━━━━━━━━━━━━━━━━━
### Dilarang membagikan atau memperjualbelikan apapun didalam server ini.
### Dilarang mengirim video, foto, stiker, atau konten pornografi di grup maupun Discord.
### Dilarang melakukan spam chat, voice, atau promosi tanpa izin admin.
### Dilarang menghina, mengancam, atau melakukan toxic berlebihan terhadap member lain
### Dilarang melakukan penipuan (scam) dalam transaksi apa pun.
### Dilarang menggunakan nickname yang mengandung unsur SARA, pornografi, atau provokasi.
### Hormati seluruh admin, dan staff server.
### Keputusan Admin dan Staff bersifat final demi kenyamanan bersama.
## 🚨 Pelanggaran rules dapat dikenakan mute, kick, suspend, hingga permanent ban tanpa pemberitahuan terlebih dahulu.
## Selamat bergabung dan semoga betah di pixelHachi ! ❤️ <@&1518986040235397300>
##💡 Punya pertanyaan? Tanya ke staf kami ya!
        `)
        .setThumbnail(channel.guild.iconURL({ dynamic: true }))
        .setFooter({ text: 'PixelHachi • Aturan Berlaku' })
        .setTimestamp();

    // ✅ Edit jika sudah ada
    if (dataTanam[kunci]?.pesanId) {
        try {
            const pesanLama = await channel.messages.fetch(dataTanam[kunci].pesanId);
            await pesanLama.edit({ embeds: [embedRules] });
            return 'diperbarui';
        } catch {
            delete dataTanam[kunci];
        }
    }
    // ✅ Kirim baru jika belum ada/hilang
    const pesanBaru = await channel.send({ embeds: [embedRules] });
    dataTanam[kunci] = { pesanId: pesanBaru.id, dikirimPada: new Date().toISOString() };
    simpanDataTanam(dataTanam);
    return 'dibuat';
}

// ============================================================
// PERINTAH SLASH
// ============================================================
const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('Cek kecepatan bot'),
    new SlashCommandBuilder().setName('info').setDescription('Info bot'),
    new SlashCommandBuilder().setName('katakataharini').setDescription('Kata motivasi'),
    new SlashCommandBuilder().setName('serverinfo').setDescription('Info server'),
    new SlashCommandBuilder().setName('userinfo').setDescription('Info pengguna')
        .addUserOption(o => o.setName('pengguna').setRequired(false).setDescription('Siapa yang dilihat')),
    new SlashCommandBuilder().setName('tanamrules').setDescription('Tanam / perbarui aturan — HANYA ADMIN')
        .setDefaultMemberPermissions(0)
].map(c => c.toJSON());

// ============================================================
// SIAP JALAN
// ============================================================
let botSudahSiap = false;
client.once('ready', async () => {
    if (botSudahSiap) return; botSudahSiap = true;
    console.log(`✅ Aktif sebagai: ${client.user.tag}`);
    client.user.setActivity('PixelHachi • Welcome • AFK • Rules', { type: 'PLAYING' });

    // Jalankan tanam aturan sekali saat nyala
    const chRules = client.channels.cache.get(CHANNEL_ID_RULES);
    if (chRules) await tanamPesanRules(chRules);
    else console.log('⚠️ CHANNEL_ID_RULES SALAH / TIDAK DITEMUKAN');

    // Simpan undangan awal
    client.guilds.cache.forEach(async g => {
        const inv = await g.invites.fetch().catch(()=>{});
        if (inv) daftarUndangan.set(g.id, new Map(inv.map(i=>[i.code,i.uses])));
    });

    // Daftar perintah
    const rest = new REST({version:'10'}).setToken(BOT_TOKEN);
    try {
        console.log('⏳ Daftar perintah...');
        await rest.put(Routes.applicationCommands(client.user.id), {body:commands});
        console.log('✅ Perintah siap');
    } catch(e){console.error('❌',e);}
});

// ============================================================
// PELACAK UNDANGAN
// ============================================================
client.on('inviteCreate', inv => {
    const sid = inv.guild.id;
    if(!daftarUndangan.has(sid)) daftarUndangan.set(sid, new Map());
    daftarUndangan.get(sid).set(inv.code, inv.uses);
});

// ============================================================
// SAMBUTAN & LOG
// ============================================================
client.on('guildMemberAdd', async m => {
    const g = m.guild;
    const chSambut = g.channels.cache.get(CHANNEL_ID_SAMBUT);
    if(chSambut) chSambut.send(`👋 Hai ${m} !, Selamat datang di **PixelHachi** 🎉, Jangan lupa ambil role disini ya <#1519245438933274664> `);

    const chLog = g.channels.cache.get(CHANNEL_ID_LOG) || chSambut;
    if(!chLog) return;

    let pengundang='Tidak diketahui', jumlah=0;
    try {
        const baru = await g.invites.fetch();
        const lama = daftarUndangan.get(g.id)||new Map();
        let ketemu=null;
        baru.forEach(i=>{if(lama.get(i.code)!==i.uses) ketemu=i;});
        if(ketemu){pengundang=ketemu.inviter.tag;jumlah=ketemu.uses;lama.set(ketemu.code,ketemu.uses);daftarUndangan.set(g.id,lama);}
    }catch(e){console.log('⚠️ Undangan gagal:',e);}

    const logEmbed = new EmbedBuilder()
        .setColor('#6f00ff').setTitle('✨ Anggota Baru')
        .setDescription(`➤ Pengguna: ${m}\n➤ Diundang: **${pengundang}**\n➤ Pakai: **${jumlah} kali**\n➤ Total: **${g.memberCount}** anggota`)
        .setFooter({text:'PixelHachi • Log'}).setTimestamp();
    chLog.send({embeds:[logEmbed]});
});

// ============================================================
// PROSES PERINTAH
// ============================================================
client.on('interactionCreate', async int => {
    if(!int.isChatInputCommand()) return;

    if(int.commandName==='ping'){
        const mulai=Date.now();await int.reply('🏓 Menghubungkan...');
        await int.editReply(`🏓 Aktif! Bot: **${Date.now()-mulai}ms** • WS: **${client.ws.ping}ms**`);
    }
    else if(int.commandName==='info'){
        const emb=new EmbedBuilder().setColor('#6f00ff').setTitle('🤖 Tentang Bot')
        .setThumbnail(client.user.displayAvatarURL())
        .addFields(
            {name:'Nama',value:client.user.tag,inline:true},
            {name:'ID',value:client.user.id,inline:true},
            {name:'Dibuat',value:`<t:${Math.floor(client.user.createdTimestamp/1000)}:R>`,inline:true},
            {name:'Server',value:`${client.guilds.cache.size}`,inline:true},
            {name:'Pengguna',value:`${client.users.cache.size}`,inline:true},
            {name:'Fitur',value:'Sambutan • Undangan • AFK • Kata Motivasi • Tanam/Edit Aturan',inline:false}
        ).setFooter({text:'PixelHachi'}).setTimestamp();
        await int.reply({embeds:[emb]});
    }
    else if(int.commandName==='katakataharini'){
        const q=quotes[Math.floor(Math.random()*quotes.length)];
        await int.reply({embeds:[new EmbedBuilder().setColor('#6200ff').setTitle('💬 Kata Hari Ini').setDescription(`"${q}"`).setFooter({text:'Semangat!'}).setTimestamp()]});
    }
    else if(int.commandName==='serverinfo'){
        const emb=new EmbedBuilder().setColor('#6200ff').setTitle(`📊 ${int.guild.name}`)
        .setThumbnail(int.guild.iconURL({dynamic:true}))
        .addFields(
            {name:'ID',value:int.guild.id,inline:true},
            {name:'Pemilik',value:`<@${int.guild.ownerId}>`,inline:true},
            {name:'Anggota',value:`${int.guild.memberCount}`,inline:true},
            {name:'Dibuat',value:`<t:${Math.floor(int.guild.createdTimestamp/1000)}:R>`,inline:true},
            {name:'Saluran',value:`${int.guild.channels.cache.size}`,inline:true},
            {name:'Peran',value:`${int.guild.roles.cache.size}`,inline:true}
        ).setFooter({text:'Info Server'}).setTimestamp();
        await int.reply({embeds:[emb]});
    }
    else if(int.commandName==='userinfo'){
        const u=int.options.getUser('pengguna')||int.user;
        const m=int.guild.members.cache.get(u.id);
        const emb=new EmbedBuilder().setColor('#5900ff').setTitle(`👤 ${u.tag}`)
        .setThumbnail(u.displayAvatarURL({dynamic:true}))
        .addFields(
            {name:'ID',value:u.id,inline:true},
            {name:'Buat Akun',value:`<t:${Math.floor(u.createdTimestamp/1000)}:R>`,inline:true},
            {name:'Masuk Server',value:m?`<t:${Math.floor(m.joinedTimestamp/1000)}:R>`:'-',inline:true},
            {name:'Peran',value:m?m.roles.cache.filter(r=>r.id!==int.guild.id).map(r=>`<@&${r.id}>`).join(', ')||'Tidak ada':'-',inline:false}
        ).setFooter({text:'Info Pengguna'}).setTimestamp();
        await int.reply({embeds:[emb]});
    }
    // ✅ PERINTAH TANAM / PERBARUI
    else if(int.commandName==='tanamrules'){
        if(!int.member.permissions.has('Administrator'))
            return int.reply({content:'❌ Hanya admin!',ephemeral:true});
        const ch = int.guild.channels.cache.get(CHANNEL_ID_RULES);
        if(!ch) return int.reply({content:'❌ Saluran aturan tidak ditemukan — cek ID',ephemeral:true});
        await int.deferReply({ephemeral:true});
        const res=await tanamPesanRules(ch);
        await int.editReply({content:res==='diperbarui'?'✅ Aturan diperbarui!':'✅ Aturan ditanam!'});
    }
});

// ============================================================
// AFK & KATA KATA DARI PESAN BIASA
// ============================================================
client.on('messageCreate', async msg => {
    if(msg.author.bot||!msg.guild) return;
    const m=msg.guild.members.cache.get(msg.author.id);if(!m)return;

    // AFK
    if(msg.content.toLowerCase()==='afk'){
        if(!daftarAfk.has(msg.author.id)) daftarAfk.set(msg.author.id,m.displayName);
        try{await m.setNickname(`[AFK] ${daftarAfk.get(msg.author.id)}`);msg.reply('✅ AFK aktif');}
        catch{msg.reply('❌ Gagal ganti nama — posisi role bot harus di atas kamu');}
        return;
    }
    if(daftarAfk.has(msg.author.id)){
        try{await m.setNickname(daftarAfk.get(msg.author.id));daftarAfk.delete(msg.author.id);msg.reply('✅ Selamat kembali!');}catch{}
    }

    // Kata kata
    const bersih=msg.content.toLowerCase().replace(/\s+/g,' ').trim();
    if(bersih==='kata kata hari ini'||bersih==='katakataharini'){
        const q=quotes[Math.floor(Math.random()*quotes.length)];
        msg.channel.send(`💬 **Kata Hari Ini:**\n${q}`);
    }
});

client.login(BOT_TOKEN);