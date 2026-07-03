const { Client } = require("discord.js-selfbot-v13");
const axios = require("axios");
const fs = require("fs");

const client = new Client({ checkUpdate: false, patchVoice: false });

const CONFIG = {
    RESULT_GUILD_ID: "1447549259120513036",
    CATEGORY_ID:     "1522597960339423393",
    API_DELAY:       2000,   // ms — rate limit koruması
    TOKEN: "x"
};

// ─────────────────────────────────────────────
//  EMOJİLER
// ─────────────────────────────────────────────
const E = {
    // Değerli rozetler
    staff:     "<:staff:1426307616077906061>",
    partner:   "<:partner:1426307340956733550>",
    hypesquad: "<:hypeshiny:1426307792649846954>",   // HypeSquad Events (nadir)
    bughunt1:  "<:bughunter_1:1426301430695727235>",
    bughunt2:  "<:bughunter_2:1426301432197419120>",
    early:     "<:early_supporter:1426301425503436852>",
    dev:       "<:developer:1426301434017611927>",
    mod:       "<:alumni:1426308069775642770>",
    activedev: "<:active_developer:1426301427123408910>",
    // Nitro — platinum ve üstü
    platinum:  "<:platinum:1426301366745432335>",
    diamond:   "<:diamond:1426301358805352600>",
    emerald:   "<:emerald:1426301360860692610>",
    ruby:      "<:ruby:1426301368536268870>",
    opal:      "<:opal:1426301365046612151>",
    // Boost
    boost1:    "<:lvl1:1426304877063180359>",
    boost2:    "<:lvl2:1426304881031118900>",
    boost3:    "<:lvl3:1426304882654314647>",
    boost4:    "<:lvl4:1426304884377915512>",
    boost5:    "<:lvl5:1426304891961217144>",
    boost6:    "<:lvl6:1426304893635002409>",
    boost7:    "<:lvl7:1426304895841075342>",
    boost8:    "<:lvl8:1426304897422463116>",
    boost9:    "<:lvl9:1426304875284926565>",
    // Kısa isim
    c1: "<:1c:1426308887270658108>",
    c2: "<:2c:1426308858942455829>",
    c3: "<:3c:1426308833780826283>",
};

// ─────────────────────────────────────────────
//  public_flags BIT → EMOJİ
//  (HypeSquad house bitleri 64/128/256 kasıtlı yok)
// ─────────────────────────────────────────────
const FLAG_MAP = [
    { bit: 1,       emoji: E.staff     },  // Discord Employee
    { bit: 2,       emoji: E.partner   },  // Partnered Server Owner
    { bit: 4,       emoji: E.hypesquad },  // HypeSquad Events
    { bit: 8,       emoji: E.bughunt1  },  // Bug Hunter Lvl 1
    { bit: 512,     emoji: E.early     },  // Early Supporter
    { bit: 16384,   emoji: E.bughunt2  },  // Bug Hunter Lvl 2
    { bit: 131072,  emoji: E.dev       },  // Verified Developer
    { bit: 262144,  emoji: E.mod       },  // Certified Moderator / Alumni
    { bit: 4194304, emoji: E.activedev },  // Active Developer
];

// ─────────────────────────────────────────────
//  Profile API badge.id → EMOJİ
//  Sadece değerli rozetler — nitro/boost buraya yok, ayrıca işleniyor
// ─────────────────────────────────────────────
const BADGE_MAP = {
    staff:                        E.staff,
    discord_employee:             E.staff,
    partner:                      E.partner,
    partnered_server_owner:       E.partner,
    hypesquad_events:             E.hypesquad,
    bug_hunter_level_1:           E.bughunt1,
    bug_hunter_level_2:           E.bughunt2,
    early_supporter:              E.early,
    early_nitro_supporter:        E.early,
    verified_developer:           E.dev,
    early_verified_bot_developer: E.dev,
    certified_moderator:          E.mod,
    moderator_programs_alumni:    E.mod,
    active_developer:             E.activedev,
    // ❌ Atlanacaklar buraya eklenmedi:
    // hypesquad_house_1/2/3, orb_profile_badge, quest_completed
    // premium, premium_tenure_1/3/6_month_v2 (bronze/silver/gold tek başına)
    // premium_tenure_12/24/36/60/72_month_v2 → aşağıda nitro bloğunda
    // guild_booster_lvl* → aşağıda boost bloğunda
};

// Nitro badge id sırası — sadece platinum ve üstü
const NITRO_ORDER = [
    { id: "premium_tenure_72_month_v2", emoji: E.opal    },
    { id: "premium_tenure_60_month_v2", emoji: E.ruby    },
    { id: "premium_tenure_36_month_v2", emoji: E.emerald },
    { id: "premium_tenure_24_month_v2", emoji: E.diamond },
    { id: "premium_tenure_12_month_v2", emoji: E.platinum},
];

// Boost badge id → emoji (ay hesabına gerek yok, API direkt level veriyor)
const BOOST_MAP = {
    guild_booster:      E.boost1,
    guild_booster_lvl1: E.boost1,
    guild_booster_lvl2: E.boost2,
    guild_booster_lvl3: E.boost3,
    guild_booster_lvl4: E.boost4,
    guild_booster_lvl5: E.boost5,
    guild_booster_lvl6: E.boost6,
    guild_booster_lvl7: E.boost7,
    guild_booster_lvl8: E.boost8,
    guild_booster_lvl9: E.boost9,
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─────────────────────────────────────────────
//  PROFILE API
// ─────────────────────────────────────────────
async function fetchProfile(userId) {
    try {
        const res = await axios.get(
            `https://discord.com/api/v9/users/${userId}/profile?with_mutual_guilds=false`,
            { headers: { Authorization: client.token } }
        );
        return res.data;
    } catch (err) {
        const status = err.response?.status;
        if (status === 429) {
            const wait = ((err.response?.data?.retry_after) || 5) * 1000;
            console.log(`[RATE LIMIT] ${userId} → ${wait}ms bekleniyor`);
            await sleep(wait);
            return fetchProfile(userId);
        }
        if (status !== 404) {
            console.log(`[API HATA] ${userId} HTTP ${status}`);
        }
        return null;
    }
}

// ─────────────────────────────────────────────
//  BADGE TOPLAMA
// ─────────────────────────────────────────────
function collectBadges(profile, member) {
    const found = new Set();
    const apiBadgeIds = new Set((profile?.badges || []).map(b => b.id));

    // 1) public_flags — API önce, 0 ise cache'e bak
    //    HypeSquad house bitleri: 64=Bravery, 128=Brilliance, 256=Balance
    //    Bunları maskeden çıkar ki bit:4 (Events) ile karışmasın
    const HOUSE_MASK = 64 | 128 | 256;
    const rawFlags = (profile?.user?.public_flags || 0)
                  || (member.user?.publicFlags?.bitfield ?? member.user?.flags?.bitfield ?? 0);
    const flags = rawFlags & ~HOUSE_MASK; // house bitlerini sıfırla

    for (const { bit, emoji } of FLAG_MAP) {
        if ((flags & bit) === bit) found.add(emoji);
    }

    // 2) Profile API badge listesi — sadece BADGE_MAP'tekileri ekle
    //    (house, orb, quest, plat altı nitro, boost BADGE_MAP'te yok)
    for (const id of apiBadgeIds) {
        const emoji = BADGE_MAP[id];
        if (emoji) found.add(emoji);
    }

    // 3) Nitro — sadece platinum ve üstü
    const hasPlatPlus = NITRO_ORDER.some(n => apiBadgeIds.has(n.id));
    if (hasPlatPlus) {
        for (const n of NITRO_ORDER) {
            if (apiBadgeIds.has(n.id)) { found.add(n.emoji); break; }
        }
    }

    // 4) Boost
    let boostEmoji = null;
    for (const [id, emoji] of Object.entries(BOOST_MAP)) {
        if (apiBadgeIds.has(id)) { boostEmoji = emoji; break; }
    }
    if (!boostEmoji && member.premiumSince) {
        const months = Math.floor((Date.now() - member.premiumSince.getTime()) / (1000 * 60 * 60 * 24 * 30));
        if      (months >= 24) boostEmoji = E.boost9;
        else if (months >= 18) boostEmoji = E.boost8;
        else if (months >= 12) boostEmoji = E.boost6;
        else if (months >= 9)  boostEmoji = E.boost5;
        else if (months >= 6)  boostEmoji = E.boost4;
        else if (months >= 3)  boostEmoji = E.boost3;
        else if (months >= 2)  boostEmoji = E.boost2;
        else                   boostEmoji = E.boost1;
    }

    if (boostEmoji) {
        const hasAnyNitro = [
            "premium","premium_tenure_1_month_v2","premium_tenure_3_month_v2",
            "premium_tenure_6_month_v2","premium_tenure_12_month_v2",
            "premium_tenure_24_month_v2","premium_tenure_36_month_v2",
            "premium_tenure_60_month_v2","premium_tenure_72_month_v2"
        ].some(id => apiBadgeIds.has(id));

        if (hasPlatPlus) {
            // Sadece plat+ varsa boost düşer
            found.add(boostEmoji);
        }
        // Plat yok (nitro yok veya plat altı) → boost düşmez
    }

    // 5) Kısa kullanıcı adı (1, 2, 3 karakter)
    const len = member.user.username.length;
    if      (len === 1) found.add(E.c1);
    else if (len === 2) found.add(E.c2);
    else if (len === 3) found.add(E.c3);

    return [...found];
}

// ─────────────────────────────────────────────
//  EMBED GÖNDER
// ─────────────────────────────────────────────
async function sendLog(channel, member, badgeList) {
    const badgeText = badgeList.join(" ") || "—";
    const statusMap = { online: "🟢", idle: "🟡", dnd: "🔴", offline: "⚫" };
    const status    = statusMap[member.presence?.status] || "⚫";
    const activity  = member.presence?.activities?.[0]?.name || "No Activity";
    const created   = member.user.createdAt.toLocaleDateString("tr-TR").replace(/\//g, ".");

    try {
        let webhooks = await channel.fetchWebhooks().catch(() => null);
        let webhook  = webhooks?.find(w => w.name === "Tilaver Scraper");
        if (!webhook) {
            webhook = await channel.createWebhook("Tilaver Scraper", {
                avatar: client.user.displayAvatarURL()
            }).catch(() => null);
        }

        const embed = {
            color: 0x5865F2,
            title: ".gg/tilaver",
            thumbnail: { url: member.user.displayAvatarURL({ dynamic: true }) },
            fields: [
                { name: " Username & ID",   value: `${member.user.tag}\n\`${member.id}\``, inline: false },
                { name: " Badges",          value: badgeText,                              inline: false },
                { name: " Status",          value: status,                                 inline: true  },
                { name: " Activity",        value: `\`${activity}\``,                      inline: true  },
                { name: " Account Created", value: created,                                inline: false },
            ],
            footer: { text: ".gg/tilaver", icon_url: client.user.displayAvatarURL() },
            timestamp: new Date()
        };

        if (webhook) await webhook.send({ embeds: [embed] });
        else         await channel.send({ embeds: [embed] });
        return true;
    } catch (err) {
        console.error(`[SEND HATA] ${member.user.tag}: ${err.message}`);
        return false;
    }
}

// ─────────────────────────────────────────────
//  SCRAPE
// ─────────────────────────────────────────────
async function startScraping(guild) {
    console.log(`\n[START] ${guild.name} (${guild.memberCount} üye)`);

    const logGuild = client.guilds.cache.get(CONFIG.RESULT_GUILD_ID);
    if (!logGuild) return console.log("[!] Log sunucusu bulunamadı!");

    const channelName = guild.name.toLowerCase()
        .replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, "-").slice(0, 100) || "scrape";

    let channel = logGuild.channels.cache.find(
        c => c.name === channelName && c.parentId === CONFIG.CATEGORY_ID
    );
    if (!channel) {
        try {
            channel = await logGuild.channels.create(channelName, {
                type: "GUILD_TEXT",
                parent: CONFIG.CATEGORY_ID,
                topic: `${guild.name} scrape`
            });
        } catch (e) {
            return console.error(`[!] Kanal açılamadı: ${e.message}`);
        }
    }

    let members;
    try { members = await guild.members.fetch({ withPresences: true }); }
    catch { members = guild.members.cache; }

    let found = 0;
    let txt   = `=== ${guild.name} ===\n\n`;

    for (const [, member] of members) {
        if (member.user.bot) continue;

        const profile = await fetchProfile(member.id);
        await sleep(CONFIG.API_DELAY);
        if (!profile) continue;

        // Konsol debug
        const rawFlags  = profile.user?.public_flags || 0;
        const rawBadges = profile.badges?.map(b => b.id).join(", ") || "yok";
        console.log(`[SCAN] ${member.user.tag.padEnd(25)} flags:${String(rawFlags).padEnd(8)} | [${rawBadges}]`);

        const badgeList = collectBadges(profile, member);
        if (badgeList.length === 0) continue;

        console.log(`[FOUND] ${member.user.tag} → ${badgeList.join(" ")}`);
        txt += `${member.user.tag} (${member.id})\n${member.user.createdAt.toLocaleDateString("tr-TR")}\n${badgeList.join(" ")}\n${"─".repeat(35)}\n`;

        const ok = await sendLog(channel, member, badgeList);
        if (ok) found++;
        await sleep(400);
    }

    const file = "results.txt";
    fs.writeFileSync(file, txt, "utf8");
    await channel.send({
        content: ` **${guild.name}** — **${found}** kullanıcı bulundu.`,
        files: [file]
    }).catch(() => {});
    fs.existsSync(file) && fs.unlinkSync(file);

    console.log(`[DONE] ${guild.name} → ${found} kullanıcı\n`);
}

// ─────────────────────────────────────────────
//  EVENTS
// ─────────────────────────────────────────────
client.on("ready", () => {
    console.log(`\n Giriş: ${client.user.tag}`);
    console.log(`tilaver\n`);
});

client.on("guildCreate", async guild => {
    if (guild.id !== CONFIG.RESULT_GUILD_ID) await startScraping(guild);
});

client.on("messageCreate", async message => {
    if (message.author.id !== client.user.id) return;
    if (!message.content.startsWith(".scan")) return;

    const targetId = message.content.split(" ")[1]?.trim();
    if (!targetId) return;
    message.delete().catch(() => null);

    const guild = await client.guilds.fetch(targetId).catch(() => null);
    if (!guild) return console.log(`[!] Sunucu bulunamadı: ${targetId}`);
    await startScraping(guild);
});

client.login(CONFIG.TOKEN);
