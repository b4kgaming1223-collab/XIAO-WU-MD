const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay } = require("gifted-baileys");
const P = require("pino");
const axios = require("axios");
const ytSearch = require("ytsearch-venom"); // 🔍 Backup සර්ච් එක සඳහා
const mfire = require("mfiredlcore-yt");    // 📥 Backup ඩවුන්ලෝඩර් එක සඳහා
const config = require("./config"); 

async function connectToWhatsApp() {
    if (!config.RYUU_API_KEY || config.RYUU_API_KEY === "") {
        console.error("\n❌ ERROR: කරුණාකර config.js එකේ RYUU_API_KEY එක දාන්න මචං!");
        process.exit(1);
    }
    if (config.MY_NUMBER === "947XXXXXXXX" || !config.MY_NUMBER) {
        console.error("\n❌ ERROR: කරුණාකර config.js එකේ MY_NUMBER එකට ඔයාගේ නම්බර් එක දාන්න!");
        process.exit(1);
    }

    const { state, saveCreds } = await useMultiFileAuthState("./xiao_wu_session");

    const sock = makeWASocket({
        auth: state,
        logger: P({ level: "silent" }),
        printQRInTerminal: false,
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    sock.ev.on("creds.update", saveCreds);

    // 🔑 Pairing Code Generator
    if (!sock.authState.creds.registered) {
        console.log(`\n🐰 Xiao Wu සර්වර් එකට සම්බන්ධ වෙනවා... නම්බර් එක: ${config.MY_NUMBER}`);
        await delay(5000); 
        try {
            let clearedNumber = config.MY_NUMBER.replace(/[^0-9]/g, ""); 
            const code = await sock.requestPairingCode(clearedNumber);
            console.log("\n==============================================");
            console.log(`💖 XIAO WU PAIRING CODE: ${code}`);
            console.log("==============================================");
            console.log("👉 මේ කෝඩ් එක ඉක්මනින්ම කොපි කරගෙන, වට්ස්ඇප් එකට ලින්ක් කරන්න!\n");
        } catch (err) {
            console.log("\n❌ කෝඩ් එක ගන්න බැරි වුණා. ආයෙත් 'npm start' දීලා බලන්න.");
        }
    }

    // 💬 මැසේජ් සහ කමාන්ඩ්ස් හැන්ඩ්ලර් එක
    sock.ev.on("messages.upsert", async (chatUpdate) => {
        try {
            const mek = chatUpdate.messages[0];
            if (!mek.message) return;
            if (mek.key.fromMe) return; 

            const from = mek.key.remoteJid;
            const type = Object.keys(mek.message)[0];
            const body = type === "conversation" ? mek.message.conversation : 
                         type === "extendedTextMessage" ? mek.message.extendedTextMessage.text : "";

            const isCmd = body.startsWith(".") || body.startsWith("/");
            if (!isCmd) return;

            const command = body.slice(1).trim().split(/ +/).shift().toLowerCase();
            const args = body.trim().split(/ +/).slice(1);
            const text = args.join(" ");

            // 🖼️ config.js එකේ ඔයා දාන ෆොටෝ එක මෙතනට වැටෙනවා
            const botImageUrl = config.BOT_IMAGE || "https://raw.githubusercontent.com/sadiyamin/Alexa/master/LaraMedia/image/lara.jpg";

            // 1. 🌸 ALIVE COMMAND (.alive)
            if (command === "alive") {
                const aliveMsg = `🐰 *XIAO WU WHATSAPP BOT* 🌸\n\n` +
                                 `*Hello San-ge! I'm Alive and Running Smoothly...* 💞\n\n` +
                                 `🤖 *Version:* 1.2.0 (Dual-Downloader)\n` +
                                 `⚙️ *Platform:* GitHub Codespaces\n` +
                                 `💎 *API Status:* Ryuu + Local Backup Connected\n\n` +
                                 `*Use .menu to see my commands!* ⚔️`;
                
                await sock.sendMessage(from, { image: { url: botImageUrl }, caption: aliveMsg }, { quoted: mek });
            }

            // 2. 📜 MENU COMMAND (.menu)
            if (command === "menu") {
                const menuMsg = `🐰 *XIAO WU BOT MAIN MENU* 🌸\n\n` +
                                 `⚔️ *Owner:* Liyo\n` +
                                 `🌸 *Prefix:* [ . ]\n\n` +
                                 `*🎵 DOWNLOAD COMMANDS (With Auto Backup):*\n` +
                                 `🛸 \`.song <song name>\` - Download MP3 Songs\n` +
                                 `🛸 \`.video <video name>\` - Download YouTube Videos\n\n` +
                                 `*🎨 AI & IMAGE COMMANDS:*\n` +
                                 `🛸 \`.imagine <prompt>\` - AI Image Generator\n\n` +
                                 `*ℹ️ INFO COMMANDS:*\n` +
                                 `🛸 \`.alive\` - Check Bot Status\n\n` +
                                 `✨ *Pure Soul Land Xiao Wu System* ✨`;

                await sock.sendMessage(from, { image: { url: botImageUrl }, caption: menuMsg }, { quoted: mek });
            }

            // 3. 🎶 SONG DOWNLOADER (.song) -> [RYUU + BACKUP DUAL METHOD]
            if (command === "song") {
                if (!text) return reply(sock, from, "🐰 *කරුණාකර සිංදුවේ නම දෙන්න මචං! (උදා: .song munasin)*", mek);
                await reply(sock, from, "📥 *Xiao Wu සිංදුව හොයනවා... පොඩ්ඩක් ඉන්න...* 🎵", mek);
                
                // 1 වෙනි ක්‍රමය: RyuuAPI එකෙන් උත්සාහ කිරීම
                try {
                    console.log("嘗試使用 RyuuAPI...");
                    const searchUrl = `https://api.ryuu.me/api/download/ytaudio?text=${encodeURIComponent(text)}&apiKey=${config.RYUU_API_KEY}`;
                    const res = await axios.get(searchUrl);
                    const downloadUrl = res.data.result;

                    if (downloadUrl && downloadUrl.startsWith("http")) {
                        return await sock.sendMessage(from, { audio: { url: downloadUrl }, mimetype: 'audio/mp4', ptt: false }, { quoted: mek });
                    }
                    throw new Error("Ryuu Invalid URL");
                } catch (e) {
                    // 2 වෙනි ක්‍රමය (Backup): RyuuAPI අවුල් නම් ඔටෝම මෙතනට මාරු වෙනවා
                    console.log("RyuuAPI Error! Backup සිස්ටම් එක ක්‍රියාත්මක කලා...");
                    try {
                        const searchResult = await ytSearch(text);
                        const videoUrl = searchResult.videos[0].url;
                        
                        const dlData = await mfire.getAudio(videoUrl);
                        const backupDlUrl = dlData.downloadUrl;

                        await sock.sendMessage(from, { audio: { url: backupDlUrl }, mimetype: 'audio/mp4', ptt: false }, { quoted: mek });
                    } catch (backupError) {
                        reply(sock, from, "❌ *අනේ මචං ක්‍රම දෙකෙන්ම සිංදුව බාගන්න බැරි වුණා. පසුව උත්සාහ කරන්න.*", mek);
                    }
                }
            }

            // 4. 📹 VIDEO DOWNLOADER (.video) -> [RYUU + BACKUP DUAL METHOD]
            if (command === "video") {
                if (!text) return reply(sock, from, "🐰 *කරුණාකර වීඩියෝවේ නම දෙන්න මචං!*", mek);
                await reply(sock, from, "📥 *Xiao Wu වීඩියෝව හොයනවා... පොඩ්ඩක් ඉන්න...* 📹", mek);
                
                // 1 වෙනි ක්‍රමය: RyuuAPI එකෙන් උත්සාහ කිරීම
                try {
                    const searchUrl = `https://api.ryuu.me/api/download/ytvideo?text=${encodeURIComponent(text)}&apiKey=${config.RYUU_API_KEY}`;
                    const res = await axios.get(searchUrl);
                    const downloadUrl = res.data.result;

                    if (downloadUrl && downloadUrl.startsWith("http")) {
                        return await sock.sendMessage(from, { video: { url: downloadUrl }, caption: "🐰 *මෙන්න ඔයාගේ වීඩියෝව! (Ryuu)* 🌸" }, { quoted: mek });
                    }
                    throw new Error("Ryuu Invalid URL");
                } catch (e) {
                    // 2 වෙනි ක්‍රමය (Backup): RyuuAPI අවුල් නම් වීඩියෝ බැකප් සිස්ටම් එක
                    console.log("RyuuAPI Video Error! Backup වීඩියෝ සිස්ටම් එක ක්‍රියාත්මක කලා...");
                    try {
                        const searchResult = await ytSearch(text);
                        const videoUrl = searchResult.videos[0].url;
                        
                        const dlData = await mfire.getVideo(videoUrl);
                        const backupDlUrl = dlData.downloadUrl;

                        await sock.sendMessage(from, { video: { url: backupDlUrl }, caption: "🐰 *මෙන්න ඔයාගේ වීඩියෝව! (Backup)* 🌸" }, { quoted: mek });
                    } catch (backupError) {
                        reply(sock, from, "❌ *ක්‍රම දෙකෙන්ම වීඩියෝව බාගැනීමට නොහැකි විය.*", mek);
                    }
                }
            }

            // 5. 🎨 AI IMAGE GENERATOR (.imagine)
            if (command === "imagine") {
                if (!text) return reply(sock, from, "🐰 *කරුණාකර සාදාගත යුතු පින්තූරයේ විස්තරයක් දෙන්න!*", mek);
                await reply(sock, from, "🎨 *Xiao Wu පින්තූරය අඳිනවා... පොඩ්ඩක් ඉන්න...* 🐇", mek);
                
                try {
                    const imgUrl = `https://api.ryuu.me/api/ai/imagine?text=${encodeURIComponent(text)}&apiKey=${config.RYUU_API_KEY}`;
                    await sock.sendMessage(from, { image: { url: imgUrl }, caption: `🐰 *Generated by Xiao Wu AI* 🌸\n\n✨ *Prompt:* ${text}` }, { quoted: mek });
                } catch (e) {
                    reply(sock, from, "❌ *පින්තූරය සෑදීමේදී දෝෂයක් ඇති විය.*", mek);
                }
            }

        } catch (error) {
            console.error("❌ Process Error:", error.message);
        }
    });

    // කනෙක්ෂන් ස්ටේටස්
    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "open") {
            console.log("\n🌸 PURE XIAO WU DUAL-DOWNLOADER BOT IS ONLINE!");
        }
        if (connection === "close") {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log("\n⚠️ Connection closed, reconnecting...");
            if (shouldReconnect) {
                await delay(5000); 
                connectToWhatsApp();
            }
        }
    });
}

async function reply(sock, from, text, mek) {
    return await sock.sendMessage(from, { text: text }, { quoted: mek });
}

connectToWhatsApp();
