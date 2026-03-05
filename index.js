const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); 

// 1. DİSCORD BOT AYARLARI
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// 2. WEB SUNUCUSU AYARLARI 
const app = express();
app.use(cors()); 
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

// Ana Sayfa (UptimeRobot buraya ping atıp botu uyanık tutacak)
app.get('/', (req, res) => {
    res.send('PVA Orbit Discord Bot is Online and Running! 🚀');
});

// Command Center'dan gelen Event (Etkinlik) bildirimlerini yakalama
app.post('/api/event-notify', async (req, res) => {
    try {
        const { eventName, multiplier, description, channelId, color } = req.body;

        const targetChannel = await client.channels.fetch(channelId);

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

// 3. EMOJİYE TIKLAMA VE ÇEKME OLAYINI YAKALAMA (Embed İçini Güncelleme)
client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot) return;
    if (reaction.partial) await reaction.fetch();
    if (reaction.message.partial) await reaction.message.fetch();

    if (reaction.emoji.name === '✅') {
        updateAttendees(reaction.message);
    }
});

client.on('messageReactionRemove', async (reaction, user) => {
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

client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}!`);
    console.log(`🚀 PVA Orbit Bot is ready to serve.`);
});

// 4. BOTU BAŞLATMA VE TOKEN
const DISCORD_TOKEN = process.env.DISCORD_TOKEN; 

if (!DISCORD_TOKEN) {
    console.error("HATA: DISCORD_TOKEN bulunamadı!");
    process.exit(1);
}

app.listen(PORT, () => {
    console.log(`Web server is listening on port ${PORT}`);
    client.login(DISCORD_TOKEN);
});


