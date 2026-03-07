const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActivityType } = require('discord.js');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); 

// ==========================================
// 1. DİSCORD BOT AYARLARI (ÇİFT MOTOR SİSTEMİ)
// ==========================================

// ✈️ BOT B: PVA Ops Bot (Eski adıyla 'client' - Etkinlikler ve Uçuşları Yönetir)
const opsBot = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// 🧑‍💼 BOT A: PVA Staff Bot (İnsan Kaynakları - Terfiler ve Rolleri Yönetir)
const staffBot = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ==========================================
// 2. WEB SUNUCUSU (EXPRESS) AYARLARI 
// ==========================================
const app = express();
app.use(cors()); 
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

// Ana Sayfa (UptimeRobot buraya ping atıp sunucuyu uyanık tutacak)
app.get('/', (req, res) => {
    res.send('PVA Orbit Multi-Bot System is Online and Running! 🚀');
});

// Command Center'dan gelen Event (Etkinlik) bildirimlerini yakalama (OPS BOT ATAR)
app.post('/api/event-notify', async (req, res) => {
    try {
        const { eventName, multiplier, description, channelId, color } = req.body;

        const targetChannel = await opsBot.channels.fetch(channelId);

        if (!targetChannel) {
            return res.status(404).json({ error: "Kanal bulunamadı!" });
        }

        const eventEmbed = new EmbedBuilder()
            .setColor(color || '#00ff00') 
            .setTitle(`📅 NEW EVENT: ${eventName}`)
            .setDescription(`${description}\n\n**Multiplier:** ${multiplier}x`)
            .setFooter({ text: 'PVA Orbit Command Center' })
            .setTimestamp();

        const sentMessage = await targetChannel.send({ embeds: [eventEmbed] });

        // Gönderilen mesaja anında otomatik ✅ emojisi bırak!
        await sentMessage.react('✅');

        res.status(200).json({ success: true, messageId: sentMessage.id });

    } catch (error) {
        console.error("Webhook Error:", error);
        res.status(500).json({ error: "Mesaj gönderilemedi." });
    }
});

// ==========================================
// 3. EMOJİYE TIKLAMA VE ÇEKME OLAYINI YAKALAMA (OPS BOT)
// ==========================================
opsBot.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot) return;
    if (reaction.partial) await reaction.fetch();
    if (reaction.message.partial) await reaction.message.fetch();

    if (reaction.emoji.name === '✅') {
        updateAttendees(reaction.message);
    }
});

opsBot.on('messageReactionRemove', async (reaction, user) => {
    if (user.bot) return;
    if (reaction.partial) await reaction.fetch();
    if (reaction.message.partial) await reaction.message.fetch();

    if (reaction.emoji.name === '✅') {
        updateAttendees(reaction.message);
    }
});

// Embed içindeki Katılımcılar listesini güncelleyen fonksiyon
async function updateAttendees(message) {
    try {
        const embed = message.embeds[0];
        if (!embed) return;

        const reaction = message.reactions.cache.get('✅');
        let attendeesText = "> *No pilots joined yet.*"; 

        if (reaction) {
            const users = await reaction.users.fetch();
            const attendingUsers = users.filter(u => !u.bot);

            if (attendingUsers.size > 0) {
                attendeesText = attendingUsers.map(u => `> ✈️ <@${u.id}>`).join('\n');
            }
        }

        const updatedEmbed = EmbedBuilder.from(embed);

        const fieldIndex = updatedEmbed.data.fields?.findIndex(f => f.name === '👥 Attending Pilots');

        if (fieldIndex >= 0) {
            updatedEmbed.data.fields[fieldIndex].value = attendeesText;
        } else {
            updatedEmbed.addFields({ name: '👥 Attending Pilots', value: attendeesText, inline: false });
        }

        await message.edit({ embeds: [updatedEmbed] });
    } catch (err) {
        console.error("Embed güncellenirken hata:", err);
    }
}

// ==========================================
// 4. GÜNÜN SÜRPRİZ ROTASI SİSTEMİ (!randomflight) - OPS BOT
// ==========================================
const pvaRoutes = [
    { dep: "OPKC", arr: "OPIS", aircraft: "Airbus A320", time: "1h 45m" },
    { dep: "OPLA", arr: "OMDB", aircraft: "Boeing 777-200LR", time: "3h 10m" },
    { dep: "OPIS", arr: "EGLL", aircraft: "Boeing 777-200ER", time: "8h 20m" },
    { dep: "OPKC", arr: "LTFM", aircraft: "Boeing 777-200ER", time: "5h 30m" }
];

opsBot.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content.toLowerCase() === '!randomflight' || message.content.toLowerCase() === '/randomflight') {
        const randomRoute = pvaRoutes[Math.floor(Math.random() * pvaRoutes.length)];
        
        await message.reply({
            content: `🎲 **Günün Sürpriz Rotası Çekildi, Kaptan!** ✈️\n\n**Kalkış:** ${randomRoute.dep}\n**Varış:** ${randomRoute.arr}\n**Önerilen Uçak:** ${randomRoute.aircraft}\n**Tahmini Süre:** ${randomRoute.time}\n\n*Sorunsuz uçuşlar ve güvenli inişler dileriz!* 🛫`
        });
    }
});

// ==========================================
// 5. BOTLARI BAŞLATMA VE TOKEN AYARLARI
// ==========================================
opsBot.once('ready', () => {
    console.log(`✅ [OPS] Logged in as ${opsBot.user.tag}!`);
    opsBot.user.setActivity('Live IF Flights', { type: ActivityType.Watching });
});

staffBot.once('ready', () => {
    console.log(`✅ [STAFF] Logged in as ${staffBot.user.tag}!`);
    staffBot.user.setActivity('Pilot Roster & Ranks', { type: ActivityType.Watching });
});

// Render Environment Variables'dan Tokenları Çekiyoruz
const OPS_TOKEN = process.env.DISCORD_TOKEN || process.env.OPS_BOT_TOKEN; // Mevcut token'ı Ops botuna devrettik
const STAFF_TOKEN = process.env.STAFF_BOT_TOKEN; 

app.listen(PORT, () => {
    console.log(`Web server is listening on port ${PORT}`);
    
    // Ops Botunu Başlat
    if (OPS_TOKEN) {
        opsBot.login(OPS_TOKEN).catch(err => console.error("Ops Bot Login Error:", err));
    } else {
        console.error("HATA: OPS_TOKEN (veya DISCORD_TOKEN) bulunamadı!");
    }

    // Staff Botunu Başlat
    if (STAFF_TOKEN) {
        staffBot.login(STAFF_TOKEN).catch(err => console.error("Staff Bot Login Error:", err));
    } else {
        console.log("⚠️ UYARI: STAFF_BOT_TOKEN bulunamadı. Lütfen Render'a ekleyin!");
    }
});
