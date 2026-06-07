const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay } = require("gifted-baileys");
const P = require("pino");
const axios = require("axios");
const config = require("./config"); 

async function startBot() {
    if (config.MY_NUMBER === "947XXXXXXXX" || !config.MY_NUMBER) {
        console.error("\n❌ ERROR: කරුණාකර config.js එකේ MY_NUMBER එකට ඔයාගේ නම්බර් එක දාන්න මචං!");
        process.exit(1);
    }

    const { state, saveCreds } = await useMultiFileAuthState("./xiao_wu_session");

    const sock = makeWASocket({
        auth: state,
        logger: P({ level: "silent" }),
        printQRInTerminal: false,
        browser: ["Ubuntu", "Chrome", "20.0.0"]
    });

    sock.ev.on("creds.update", saveCreds);

    if (!sock.authState.creds.registered) {
        console.log(`\n🐰 Xiao Wu සර්වර් එකට සම්බන්ධ වෙනවා... නම්බර් එක: ${config.MY_NUMBER}`);
        await delay(6000); 
        try {
            let clearedNumber = config.MY_NUMBER.replace(/[^0-9]/g, ""); 
            const code = await sock.requestPairingCode(clearedNumber);
            console.log("\n==============================================");
            console.log(`🔑 YOUR SOUL BIND CODE: ${code}`);
            console.log("==============================================");
        } catch (err) {
            console.log("\n❌ කෝඩ් එක ගන්න බැරි වුණා.");
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
            }
        }
    });

    sock.ev.on("messages.upsert", async (chatUpdate) => {
        try {
            const mek = chatUpdate.messages[0];
            if (!mek.message) return; 

            const from = mek.key.remoteJid;
            
            // 🛠️ Loop crash fix (තමන්ගේම මැසේජ් වලට රිප්ලයි වීම වැළැක්වීම)
            const botNumber = config.MY_NUMBER.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
            if (mek.key.fromMe && from === botNumber) return; 

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

            // ========================================================
            // 🐰 MENU COMMAND (XIAO WU TALKING STYLE)
            // ========================================================
            if (command === "menu") {
                const premiumMenu = `┏━━━━━━━✨━━━━━━━┓\n` +
                                    `  🐰 *XIAO WU MAIN MENU* 🌸\n` +
                                    `┗━━━━━━━✨━━━━━━━┛\n\n` +
                                    `*ආයුබෝවන් ${senderName} ක්ලෑන් එකේ වීරයා!* ⚔️\n\n` +
                                    `┌────────────────────────~\n` +
                                    `│ 👑 *Master:* ${config.OWNER_NAME}\n` +
                                    `│ 🌟 *Realm:* ${config.OWNER_REALM}\n` +
                                    `│ 🌸 *Prefix:* [ . ]\n` +
                                    `│ 💎 *Status:* Pure Soft Matrix Active\n` +
                                    `└────────────────────────~\n\n` +
                                    `*✨ ── Xiao Wu ගේ බලසම්පන්න හැකියාවන් ── ✨*\n\n` +
                                    `🛸 \`.menu\` ── මගේ මෙනු ලිස්ට් එක බලන්න 📜\n` +
                                    `🛸 \`.alive\` ── මම ඔන්ලයින්ද කියලා චෙක් කරන්න 🐰\n` +
                                    `🛸 \`.song\` <නම> ── ලස්සන සින්දු MP3 බාගන්න 📥\n` +
                                    `🛸 \`.video\` <නම> ── සුපැහැදිලි වීඩියෝ MP4 බාගන්න 📹\n\n` +
                                    `*🌸 "${config.OWNER_NAME}", ඔයාව රකින්න මගේ මුළු ආත්මය වුණත් මම පූජා කරනවා! - Xiao Wu v5.8.0 ✨*`;

                // පින්තූරය යැවීම
                const sentMsg = await sock.sendMessage(from, { image: { url: botImageUrl }, caption: premiumMenu }, { quoted: mek });
                
                // ඔටෝ ඕඩියෝ වොයිස් නෝට් එක
                if (config.MENU_AUDIO) {
                    await delay(800);
                    try {
                        await sock.sendMessage(from, { 
                            audio: { url: config.MENU_AUDIO }, 
                            mimetype: 'audio/mp4', 
                            ptt: true 
                        }, { quoted: sentMsg });
                    } catch (e) { console.log("Audio Error"); }
                }
                return;
            }

            // ========================================================
            // 🐰 ALIVE COMMAND (XIAO WU TALKING STYLE)
            // ========================================================
            if (command === "alive") {
                const aliveMsg = `╭───━━━━🌟━━━━───╮\n` +
                                 `  🐰 *XIAO WU STATUS* 🐰\n` +
                                 `╰───━━━━🌟━━━━───╯\n\n` +
                                 `*Hii ${senderName}! මම ඔයා වෙනුවෙන් සාර්ථකව ඔන්ලයින් ඉන්නේ...* 💞\n\n` +
                                 `_ඔයා දන්නවද, සන්-ගී (San-ge) වගේම මම හැමවෙලේම ඔයාව ආරක්ෂා කරන්න සූදානම්!_ ⚔️\n\n` +
                                 `┌────────────────────────~\n` +
                                 `│ 🤖 *Bot Name:* Xiao Wu MD\n` +
                                 `│ ⚙️ *Version:* 5.8.0 (Premium Core)\n` +
                                 `│ 💻 *Engine:* Fixed Gifted Core\n` +
                                 `│ 💎 *Mode:* Pure Soul Ring Active\n` +
                                 `└────────────────────────~\n\n` +
                                 `_\"මම කොහේ හිටියත් මගේ හදවත ඔයා ළඟයි...\"_ 🌸`;

                const sentMsg = await sock.sendMessage(from, { image: { url: botImageUrl }, caption: aliveMsg }, { quoted: mek });
                
                if (config.ALIVE_AUDIO) {
                    await delay(800);
                    try {
                        await sock.sendMessage(from, { 
                            audio: { url: config.ALIVE_AUDIO }, 
                            mimetype: 'audio/mp4', 
                            ptt: true 
                        }, { quoted: sentMsg });
                    } catch (e) { console.log("Audio Error"); }
                }
                return;
            }

            // ========================================================
            // 🎶 FIXED SONG DOWNLOADER (NEW GIFTED TECH API)
            // ========================================================
            if (command === "song") {
                if (!text) return sock.sendMessage(from, { text: "🐰 *Xiao Wu ට සිංදුවේ නම කියන්නකෝ අනේ!*" }, { quoted: mek });
                await sock.sendMessage(from, { text: "📥 *Xiao Wu ඔයා වෙනුවෙන් සිංදුව හොයනවා... පොඩ්ඩක් ඉන්න සුදූ...* 🎵" }, { quoted: mek });
                try {
                    // ඔයා එවපු Gifted API එක ලස්සනට සෙට් කළා මචං
                    const res = await axios.get(`https://api.giftedtech.my.id/api/download/ytmp3?url=${encodeURIComponent(text)}`);
                    const downloadUrl = res.data.result.download_url;
                    
                    if (downloadUrl) {
                        return await sock.sendMessage(from, { audio: { url: downloadUrl }, mimetype: 'audio/mp4', ptt: false }, { quoted: mek });
                    } else {
                        return sock.sendMessage(from, { text: "❌ *අනේ මට ඒ සිංදුව හොයාගන්න බැරි වුණානේ...*" }, { quoted: mek });
                    }
                } catch (e) {
                    return sock.sendMessage(from, { text: "❌ *සිංදුව සෙවීමේදී දෝෂයක් ඇති වුණා මචං.*" }, { quoted: mek });
                }
            }

            // ========================================================
            // 📹 FIXED VIDEO DOWNLOADER (NEW GIFTED TECH API)
            // ========================================================
            if (command === "video") {
                if (!text) return sock.sendMessage(from, { text: "🐰 *Xiao Wu ට වීඩියෝ එකේ නම කියන්නකෝ!*" }, { quoted: mek });
                await sock.sendMessage(from, { text: "📥 *Xiao Wu ඔයා වෙනුවෙන් වීඩියෝව හොයනවා... පොඩ්ඩක් ඉන්න...* 📹" }, { quoted: mek });
                try {
                    const res = await axios.get(`https://api.giftedtech.my.id/api/download/ytmp4?url=${encodeURIComponent(text)}`);
                    const downloadUrl = res.data.result.download_url;
                    const title = res.data.result.title || "Xiao Wu Video";
                    
                    if (downloadUrl) {
                        return await sock.sendMessage(from, { video: { url: downloadUrl }, caption: `🐰 *මෙන්න ඔයා ඉල්ලපු වීඩියෝව මම ගෙනාවා!* 🌸\n\n🎬 *Title:* ${title}` }, { quoted: mek });
                    } else {
                        return sock.sendMessage(from, { text: "❌ *අනේ මට ඒ වීඩියෝව හොයාගන්න බැරි වුණා...*" }, { quoted: mek });
                    }
                } catch (e) {
                    return sock.sendMessage(from, { text: "❌ *වීඩියෝව සෙවීමේදී දෝෂයක් ඇති වුණා මචං.*" }, { "../../": "" }, { quoted: mek });
                }
            }

        } catch (error) {
            console.error("❌ Process Error:", error.message);
        }
    });
}

startBot();
