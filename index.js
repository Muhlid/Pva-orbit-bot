const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActivityType } = require('discord.js');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); 

// ==========================================
// 1. DISCORD BOT SETTINGS
// ==========================================

const opsBot = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

const staffBot = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ==========================================
// 2. WEB SERVER (EXPRESS) SETTINGS
// ==========================================
const app = express();
app.use(cors()); 
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('PVA Orbit Multi-Bot System is Online and Running! 🚀');
});

app.post('/api/event-notify', async (req, res) => {
    try {
        const { eventName, multiplier, description, channelId, color } = req.body;
        const targetChannel = await opsBot.channels.fetch(channelId);
        if (!targetChannel) return res.status(404).json({ error: "Channel not found!" });

        const eventEmbed = new EmbedBuilder()
            .setColor(color || '#00ff00') 
            .setTitle(`📅 NEW EVENT: ${eventName}`)
            .setDescription(`${description}\n\n**Multiplier:** ${multiplier}x`)
            .setFooter({ text: 'PVA Orbit Command Center' })
            .setTimestamp();

        const sentMessage = await targetChannel.send({ embeds: [eventEmbed] });
        await sentMessage.react('✅');
        res.status(200).json({ success: true, messageId: sentMessage.id });
    } catch (error) {
        console.error("Webhook Error:", error);
        res.status(500).json({ error: "Failed to send message." });
    }
});

// ==========================================
// 3. REACTION TRACKING SYSTEM (OPS BOT)
// ==========================================
opsBot.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot) return;
    if (reaction.partial) await reaction.fetch();
    if (reaction.message.partial) await reaction.message.fetch();
    if (reaction.emoji.name === '✅') updateAttendees(reaction.message);
});

opsBot.on('messageReactionRemove', async (reaction, user) => {
    if (user.bot) return;
    if (reaction.partial) await reaction.fetch();
    if (reaction.message.partial) await reaction.message.fetch();
    if (reaction.emoji.name === '✅') updateAttendees(reaction.message);
});

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
        if (fieldIndex >= 0) updatedEmbed.data.fields[fieldIndex].value = attendeesText;
        else updatedEmbed.addFields({ name: '👥 Attending Pilots', value: attendeesText, inline: false });

        await message.edit({ embeds: [updatedEmbed] });
    } catch (err) { console.error("Error updating embed:", err); }
}

// ==========================================
// 4. RANDOM FLIGHT GENERATOR (!randomflight) - OPS BOT ONLY
// ==========================================
const pvaRoutes = [
    { dep: "OPLA", arr: "CYYZ", aircraft: "Boeing 777-200LR", time: "14h 15m", note: "Toronto - Ultra Long Haul" },
    { dep: "OPIS", arr: "EGLL", aircraft: "Boeing 777-200LR", time: "8h 30m", note: "London Heathrow" },
    { dep: "OPKC", arr: "OEJN", aircraft: "Boeing 777-300LR", time: "4h 25m", note: "Jeddah" },
    { dep: "OPLA", arr: "OEMA", aircraft: "Boeing 777-200LR", time: "4h 50m", note: "Medina" },
    { dep: "OPIS", arr: "LTFM", aircraft: "Airbus A320 / B777", time: "5h 40m", note: "Istanbul" },
    { dep: "OPKC", arr: "OMDB", aircraft: "Airbus A320", time: "2h 10m", note: "Dubai" },
    { dep: "OPKC", arr: "VYYY", aircraft: "Airbus A320", time: "5h 25m", note: "Yangon" },
    { dep: "OPLA", arr: "LEBL", aircraft: "Boeing 777-200LR", time: "8h 55m", note: "Barcelona" },
    { dep: "OPIS", arr: "OTHH", aircraft: "Airbus A320", time: "3h 35m", note: "Doha" },
    { dep: "OPKC", arr: "VTBS", aircraft: "Boeing 777-200LR", time: "5h 15m", note: "Bangkok" },
    { dep: "OPLA", arr: "OEDF", aircraft: "Boeing 777-200LR", time: "4h 20m", note: "Dammam" },
    { dep: "OPIS", arr: "OERY", aircraft: "Airbus A320", time: "4h 10m", note: "Riyadh" },
    { dep: "OPIS", arr: "OPSD", aircraft: "Airbus A320", time: "1h 05m", note: "Skardu" },
    { dep: "OPIS", arr: "OPGT", aircraft: "Dash 8-Q400", time: "1h 10m", note: "Gilgit" },
    { dep: "OPKC", arr: "OPLA", aircraft: "Boeing 777 / A320", time: "1h 40m", note: "Karachi-Lahore" },
    { dep: "OPIS", arr: "OPKC", aircraft: "Airbus A320", time: "1h 55m", note: "Islamabad-Karachi" },
    { dep: "OPKC", arr: "OPQT", aircraft: "Airbus A320", time: "1h 20m", note: "Quetta" },
    { dep: "OPLA", arr: "OPMT", aircraft: "Airbus A320", time: "0h 55m", note: "Multan" },
    { dep: "OPKC", arr: "OPGZ", aircraft: "Dash 8-Q400", time: "1h 35m", note: "Gwadar" },
    { dep: "OPLA", arr: "OPST", aircraft: "Airbus A320", time: "0h 45m", note: "Sialkot" },
    { dep: "OPIS", arr: "OPPS", aircraft: "Airbus A320", time: "0h 50m", note: "Peshawar" },
    { dep: "OPKC", arr: "OPSK", aircraft: "Dash 8-Q400", time: "1h 15m", note: "Sukkur" }
];

// SADECE OPS BOT cevap versin diye kısıtladık
opsBot.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const content = message.content.toLowerCase();
    if (content === '!randomflight' || content === '/randomflight') {
        const route = pvaRoutes[Math.floor(Math.random() * pvaRoutes.length)];
        
        await message.reply({
            content: `🎲 **Surprise Route of the Day, Captain!**\n\n` +
                     `**Departure:** ${route.dep}\n` +
                     `**Arrival:** ${route.arr}\n` +
                     `**Suggested Aircraft:** ${route.aircraft}\n` +
                     `**Estimated Time:** ${route.time}\n` +
                     `**Flight Type:** ${route.note || 'Regular'}\n\n` +
                     `*Wishing you smooth flights and safe landings!* `
        });
    }
});

// ==========================================
// 5. BOT INITIALIZATION
// ==========================================
opsBot.once('ready', () => {
    console.log(`✅ [OPS] Logged in as ${opsBot.user.tag}!`);
    opsBot.user.setActivity('Live IF Flights', { type: ActivityType.Watching });
});

staffBot.once('ready', () => {
    console.log(`✅ [STAFF] Logged in as ${staffBot.user.tag}!`);
    staffBot.user.setActivity('Pilot Roster & Ranks', { type: ActivityType.Watching });
});

const OPS_TOKEN = process.env.DISCORD_TOKEN || process.env.OPS_BOT_TOKEN; 
const STAFF_TOKEN = process.env.STAFF_BOT_TOKEN; 

app.listen(PORT, () => {
    console.log(`Web server listening on port ${PORT}`);
    if (OPS_TOKEN) opsBot.login(OPS_TOKEN).catch(err => console.error("Ops Bot Err:", err));
    if (STAFF_TOKEN) staffBot.login(STAFF_TOKEN).catch(err => console.error("Staff Bot Err:", err));
});
