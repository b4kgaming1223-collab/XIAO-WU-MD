const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay } = require("gifted-baileys");
const P = require("pino");
const axios = require("axios");
const ffmpegPath = require("ffmpeg-static"); // 🛠️ Codespaces FFmpeg ලින්ක් එක
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
        console.log(`\n🐰 Xiao Wu සර්වර් එකට සම්බන්ධ වෙනවා...`);
        await delay(6000); 
        try {
            let clearedNumber = config.MY_NUMBER.replace(/[^0-9]/g, ""); 
            const code = await sock.requestPairingCode(clearedNumber);
            console.log(`\n🔑 YOUR SOUL BIND CODE: ${code}`);
        } catch (err) { console.log("\n❌ Code error"); }
    }

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "open") console.log("\n🌸 PURE XIAO WU PREMIUM ENGINE ONLINE!");
        if (connection === "close") {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) { await delay(5000); startBot(); }
        }
    });

    sock.ev.on("messages.upsert", async (chatUpdate) => {
        try {
            const mek = chatUpdate.messages[0];
            if (!mek.message) return; 

            const from = mek.key.remoteJid;
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

            const senderName = mek.pushName || "Warrior";
            const botImageUrl = config.BOT_IMAGE || "https://raw.githubusercontent.com/sadiyamin/Alexa/master/LaraMedia/image/lara.jpg";

            // 🛠️ CODESPACES 100% WORKING PTT VOICE NOTE SENDER
            const sendStablePTT = async (targetJid, audioUrl, quotedMessage) => {
                try {
                    const response = await axios({
                        method: 'get',
                        url: audioUrl,
                        responseType: 'arraybuffer'
                    });
                    const audioBuffer = Buffer.from(response.data, 'binary');
                    
                    // 🎧 මෙතනින් කෙලින්ම True WhatsApp Voice Note (PTT) එකක් විදිහට යවනවා මචං
                    await sock.sendMessage(targetJid, { 
                        audio: audioBuffer, 
                        mimetype: 'audio/mp4', 
                        ptt: true // මේක true නිසා රියල් වොයිස් එකක් වගේ යනවා
                    }, { quoted: quotedMessage });
                } catch (err) {
                    console.log("❌ Audio Playback Error:", err.message);
                }
            };

            // ========================================================
            // 🐰 MENU COMMAND
            // ========================================================
            if (command === "menu") {
                const premiumMenu = `┏━━━━━━━✨━━━━━━━┓\n` +
                                    `  🐰 *XIAO WU MAIN MENU* 🌸\n` +
                                    `┗━━━━━━━✨━━━━━━━┛\n\n` +
                                    `*ආයුබෝවන් ${senderName}!* ⚔️\n\n` +
                                    `┌────────────────────────~\n` +
                                    `│ 👑 *Master:* ${config.OWNER_NAME}\n` +
                                    `│ 🌟 *Realm:* ${config.OWNER_REALM}\n` +
                                    `│ 🌸 *Prefix:* [ . ]\n` +
                                    `│ 💎 *Status:* Active\n` +
                                    `└────────────────────────~\n\n` +
                                    `*✨ ── කමාන්ඩ් ලිස්ට් එක ── ✨*\n\n` +
                                    `🛸 \`.menu\` ── ප්‍රධාන මෙනුව බැලීමට 📜\n` +
                                    `🛸 \`.alive\` ── බොට් ක්‍රියාකාරීත්වය සෙවීමට 🐰\n` +
                                    `🛸 \`.song\` <නම> ── Youtube MP3 බාගැනීමට 📥\n` +
                                    `🛸 \`.video\` <නම> ── Youtube MP4 බාගැනීමට 📹\n\n` +
                                    `*🌸 Xiao Wu MD v6.2.0 - Real PTT Mode Active ✨*`;

                const sentMsg = await sock.sendMessage(from, { image: { url: botImageUrl }, caption: premiumMenu }, { quoted: mek });
                if (config.MENU_AUDIO) {
                    await delay(800);
                    await sendStablePTT(from, config.MENU_AUDIO, sentMsg);
                }
                return;
            }

            // ========================================================
            // 🐰 ALIVE COMMAND
            // ========================================================
            if (command === "alive") {
                const aliveMsg = `╭───━━━━🌟━━━━───╮\n` +
                                 `  🐰 *XIAO WU STATUS* 🐰\n` +
                                 `╰───━━━━🌟━━━━───╯\n\n` +
                                 `*Hello ${senderName}! මම සාර්ථකව ඔන්ලයින් ඉන්නේ...* 🌸\n\n` +
                                 `┌────────────────────────~\n` +
                                 `│ 🤖 *Bot Name:* Xiao Wu MD\n` +
                                 `│ ⚙️ *Version:* 6.2.0 (Premium Core)\n` +
                                 `│ 💻 *Engine:* Fixed Gifted Core\n` +
                                 `│ 💎 *Mode:* Pure Soul Ring Active\n` +
                                 `└────────────────────────~\n\n` +
                                 `_\"Ready to assist you anytime!\"_ ⚔️`;

                const sentMsg = await sock.sendMessage(from, { image: { url: botImageUrl }, caption: aliveMsg }, { quoted: mek });
                if (config.ALIVE_AUDIO) {
                    await delay(800);
                    await sendStablePTT(from, config.ALIVE_AUDIO, sentMsg);
                }
                return;
            }

            // ========================================================
            // 🎶 SONG DOWNLOADER (MP3 PLAYER STYLE)
            // ========================================================
            if (command === "song") {
                if (!text) return sock.sendMessage(from, { text: "🐰 *කරුණාකර සිංදුවේ නම හෝ ලින්ක් එක ලබාදෙන්න.*" }, { quoted: mek });
                await sock.sendMessage(from, { text: "📥 *Xiao Wu සිංදුව සොයමින් පවතී... පොඩ්ඩක් ඉන්න...* 🎵" }, { quoted: mek });
                try {
                    const res = await axios.get(`https://api.giftedtech.my.id/api/download/ytmp3?url=${encodeURIComponent(text)}`);
                    const downloadUrl = res.data.result.download_url;
                    
                    if (downloadUrl) {
                        const audioRes = await axios({ method: 'get', url: downloadUrl, responseType: 'arraybuffer' });
                        return await sock.sendMessage(from, { audio: Buffer.from(audioRes.data, 'binary'), mimetype: 'audio/mpeg', ptt: false }, { quoted: mek });
                    } else {
                        return sock.sendMessage(from, { text: "❌ *සිංදුව සොයාගත නොහැකි විය.*" }, { quoted: mek });
                    }
                } catch (e) { return sock.sendMessage(from, { text: "❌ *සෙවීමේදී දෝෂයක් ඇති වුණා.*" }, { quoted: mek }); }
            }

            // ========================================================
            // 📹 VIDEO DOWNLOADER
            // ========================================================
            if (command === "video") {
                if (!text) return sock.sendMessage(from, { text: "🐰 *කරුණාකර වීඩියෝවේ නම හෝ ලින්ක් එක ලබාදෙන්න.*" }, { quoted: mek });
                await sock.sendMessage(from, { text: "📥 *Xiao Wu වීඩියෝව සොයමින් පවතී... පොඩ්ඩක් ඉන්න...* 📹" }, { quoted: mek });
                try {
                    const res = await axios.get(`https://api.giftedtech.my.id/api/download/ytmp4?url=${encodeURIComponent(text)}`);
                    const downloadUrl = res.data.result.download_url;
                    const title = res.data.result.title || "Xiao Wu Video";
                    
                    if (downloadUrl) {
                        return await sock.sendMessage(from, { video: { url: downloadUrl }, caption: `🐰 *මෙන්න ඔයා ඉල්ලපු වීඩියෝව!* 🌸\n\n🎬 *Title:* ${title}` }, { quoted: mek });
                    } else { return sock.sendMessage(from, { text: "❌ *වීඩියෝව සොයාගත නොහැකි විය.*" }, { quoted: mek }); }
                } catch (e) { return sock.sendMessage(from, { text: "❌ *වීඩියෝව සෙවීමේදී දෝෂයක් ඇති වුණා.*" }, { quoted: mek }); }
            }

        } catch (error) { console.error("❌ Process Error:", error.message); }
    });
}

startBot();
