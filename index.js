const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay } = require("gifted-baileys");
const P = require("pino");
const axios = require("axios");
const ytdl = require("@distube/ytdl-core");
const config = require("./config"); 

async function startBot() {
    if (config.MY_NUMBER === "947XXXXXXXX" || !config.MY_NUMBER) {
        console.error("\n❌ ERROR: කරුණාකර config.js එකේ MY_NUMBER එකට ඔයාගේ නම්බර් එක දාන්න මචං!");
        process.exit(1);
    }

    // ස්ටේබල් Xiao Wu සෙෂන් ස්ටෝරේජ් එක
    const { state, saveCreds } = await useMultiFileAuthState("./xiao_wu_session");

    const sock = makeWASocket({
        auth: state,
        logger: P({ level: "silent" }),
        printQRInTerminal: false,
        browser: ["Ubuntu", "Chrome", "20.0.0"]
    });

    sock.ev.on("creds.update", saveCreds);

    // 📱 Config එකෙන් නම්බර් එක අරන් ඔටෝම Pairing Code එක දෙන සිස්ටම් එක
    if (!sock.authState.creds.registered) {
        console.log(`\n🐰 Xiao Wu සර්වර් එකට සම්බන්ධ වෙනවා... නම්බර් එක: ${config.MY_NUMBER}`);
        await delay(6000); 
        try {
            let clearedNumber = config.MY_NUMBER.replace(/[^0-9]/g, ""); 
            const code = await sock.requestPairingCode(clearedNumber);
            console.log("\n==============================================");
            console.log(`🔑 YOUR SOUL BIND CODE: ${code}`);
            console.log("==============================================");
            console.log("👉 මේ කෝඩ් එක ඉක්මනින්ම කොපි කරගෙන වට්ස්ඇප් එකට ලින්ක් කරන්න මචං!\n");
        } catch (err) {
            console.log("\n❌ කෝඩ් එක ගන්න බැරි වුණා. ටික වෙලාවකින් 'npm start' දීලා බලන්න.");
        }
    }

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "open") {
            console.log("\n🌸 PURE XIAO WU PREMIUM ENGINE ONLINE & WA CONNECTED!");
        }
        if (connection === "close") {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                await delay(5000); 
                startBot();
            } else {
                console.log("⚠️ සෙෂන් එක ඉවරයි! xiao_wu_session ෆෝල්ඩර් එක මකලා රීස්ටාර්ට් කරන්න.");
            }
        }
    });

    sock.ev.on("messages.upsert", async (chatUpdate) => {
        try {
            const mek = chatUpdate.messages[0];
            if (!mek.message || mek.key.fromMe) return; 

            const from = mek.key.remoteJid;
            const type = Object.keys(mek.message)[0];
            const body = type === "conversation" ? mek.message.conversation : 
                         type === "extendedTextMessage" ? mek.message.extendedTextMessage.text : "";

            const isCmd = body.startsWith(".") || body.startsWith("/");
            if (!isCmd) return;

            const command = body.slice(1).trim().split(/ +/).shift().toLowerCase();
            const args = body.trim().split(/ +/).slice(1);
            const text = args.join(" ");

            const senderName = mek.pushName || "Soul Land Warrior";
            const botImageUrl = config.BOT_IMAGE || "https://raw.githubusercontent.com/sadiyamin/Alexa/master/LaraMedia/image/lara.jpg";

            // 📜 SOUL LAND THEME BOX STYLE MENU
            if (command === "menu") {
                const premiumMenu = `┏━━━━━━━✨━━━━━━━┓\n` +
                                    `  🐰 *XIAO WU MAIN MENU* 🌸\n` +
                                    `┗━━━━━━━✨━━━━━━━┛\n\n` +
                                    `┌────────────────────────~\n` +
                                    `│ 👑 *Master:* ${config.OWNER_NAME}\n` +
                                    `│ 🌟 *Realm:* ${config.OWNER_REALM}\n` +
                                    `│ 🌸 *Prefix:* [ . ]\n` +
                                    `│ 💎 *Status:* Pure Soft Matrix Active\n` +
                                    `└────────────────────────~\n\n` +
                                    `*✨ ── SOUL SKILLS LIST ── ✨*\n\n` +
                                    `🛸 \`.menu\` ── මෙනු ලිස්ට් එක බැලීමට 📜\n` +
                                    `🛸 \`.alive\` ── බොට් ඔන්ලයින්ද බැලීමට 🐰\n` +
                                    `🛸 \`.song\` <නම> ── උසස් තත්වයේ MP3 බාගැනීමට 📥\n` +
                                    `🛸 \`.video\` <නම> ── සුපැහැදිලි MP4 බාගැනීමට 📹\n\n` +
                                    `*✨ "Even if I sacrifice my soul, I will protect you!" - Xiao Wu v5.6.0 ✨*`;

                await sock.sendMessage(from, { image: { url: botImageUrl }, caption: premiumMenu }, { quoted: mek });
                
                if (config.MENU_AUDIO) {
                    try {
                        await sock.sendMessage(from, { audio: { url: config.MENU_AUDIO }, mimetype: 'audio/mp4', ptt: true }, { quoted: mek });
                    } catch (e) { console.log("Audio Send Error"); }
                }
                return;
            }

            // 🐰 SOUL LAND THEME ALIVE
            if (command === "alive") {
                const aliveMsg = `╭───━━━━🌟━━━━───╮\n` +
                                 `  🐰 *XIAO WU STATUS* 🐰\n` +
                                 `╰───━━━━🌟━━━━───╯\n\n` +
                                 `*Hii ${senderName}! මම සාර්ථකව ඔන්ලයින් ඉන්නේ...* 💞\n\n` +
                                 `┌────────────────────────~\n` +
                                 `│ 🤖 *Bot Name:* Xiao Wu MD\n` +
                                 `│ ⚙️ *Version:* 5.6.0 (Premium Core)\n` +
                                 `│ 💻 *Engine:* Fixed Lara-Baileys Core\n` +
                                 `│ 💎 *Mode:* Pure Soul Ring Active\n` +
                                 `└────────────────────────~\n\n` +
                                 `_\"San-ge, Xiao Wu is always here with you to protect!\"_ ⚔️`;

                await sock.sendMessage(from, { image: { url: botImageUrl }, caption: aliveMsg }, { quoted: mek });
                
                if (config.ALIVE_AUDIO) {
                    try {
                        await sock.sendMessage(from, { audio: { url: config.ALIVE_AUDIO }, mimetype: 'audio/mp4', ptt: true }, { quoted: mek });
                    } catch (e) { console.log("Audio Send Error"); }
                }
                return;
            }

            // 🎶 FIXED SONG DOWNLOADER
            if (command === "song") {
                if (!text) return sock.sendMessage(from, { text: "🐰 *කරුණාකරසිංදුවේ නම දෙන්න මචං!*" }, { quoted: mek });
                await sock.sendMessage(from, { text: "📥 *Xiao Wu සිංදුව හොයනවා... පොඩ්ඩක් ඉන්න...* 🎵" }, { quoted: mek });
                
                try {
                    const searchRes = await axios.get(`https://tools.bright.io.vn/api/youtube/search?query=${encodeURIComponent(text)}`);
                    const videoUrl = searchRes.data.results[0].url;
                    const info = await ytdl.getInfo(videoUrl);
                    const format = ytdl.chooseFormat(info.formats, { quality: '140' }); 

                    if (format && format.url) {
                        return await sock.sendMessage(from, { audio: { url: format.url }, mimetype: 'audio/mp4', ptt: false }, { quoted: mek });
                    }
                } catch (e) {
                    return sock.sendMessage(from, { text: "❌ *සිංදුව සෙවීමේදී හෝ බාගැනීමේදී දෝෂයක් ඇති විය.*" }, { quoted: mek });
                }
            }

            // 📹 FIXED VIDEO DOWNLOADER
            if (command === "video") {
                if (!text) return sock.sendMessage(from, { text: "🐰 *කරුණාකර වීඩියෝවේ නම දෙන්න!*" }, { quoted: mek });
                await sock.sendMessage(from, { text: "📥 *Xiao Wu වීඩියෝව හොයනවා... පොඩ්ඩක් ඉන්න...* 📹" }, { quoted: mek });
                
                try {
                    const searchRes = await axios.get(`https://tools.bright.io.vn/api/youtube/search?query=${encodeURIComponent(text)}`);
                    const videoUrl = searchRes.data.results[0].url;
                    const info = await ytdl.getInfo(videoUrl);
                    const format = ytdl.chooseFormat(info.formats, { quality: '18' }); 

                    if (format && format.url) {
                        return await sock.sendMessage(from, { video: { url: format.url }, caption: `🐰 *මෙන්න ඔයාගේ වීඩියෝව!* 🌸\n\n🎬 *Title:* ${searchRes.data.results[0].title}` }, { quoted: mek });
                    }
                } catch (e) {
                    return sock.sendMessage(from, { text: "❌ *වීඩියෝව සෙවීමේදී හෝ බාගැනීමේදී දෝෂයක් ඇති විය.*" }, { quoted: mek });
                }
            }

        } catch (error) {
            console.error("❌ Process Error:", error.message);
        }
    });
}

startBot();
