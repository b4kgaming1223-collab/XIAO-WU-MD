const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay } = require("gifted-baileys");
const P = require("pino");
const axios = require("axios");
const ytdl = require("@distube/ytdl-core");
const { youtube } = require("@bochilteam/scraper");
const config = require("./config"); 

async function connectToWhatsApp() {
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

            const botImageUrl = config.BOT_IMAGE || "https://raw.githubusercontent.com/sadiyamin/Alexa/master/LaraMedia/image/lara.jpg";

            // 1. 🌸 ALIVE COMMAND
            if (command === "alive") {
                const aliveMsg = `🐰 *XIAO WU WHATSAPP BOT* 🌸\n\n` +
                                 `*Hello San-ge! I'm Alive and Running Smoothly...* 💞\n\n` +
                                 `🤖 *Version:* 1.5.0 (No-API Stable)\n` +
                                 `⚙️ *Platform:* GitHub Codespaces\n` +
                                 `💎 *System Status:* Built-in Engine Connected\n\n` +
                                 `*Use .menu to see my commands!* ⚔️`;
                
                await sock.sendMessage(from, { image: { url: botImageUrl }, caption: aliveMsg }, { quoted: mek });
            }

            // 2. 📜 MENU COMMAND
            if (command === "menu") {
                const menuMsg = `🐰 *XIAO WU BOT MAIN MENU* 🌸\n\n` +
                                 `⚔️ *Owner:* Liyo\n` +
                                 `🌸 *Prefix:* [ . ]\n\n` +
                                 `*🎵 DOWNLOAD COMMANDS:*\n` +
                                 `🛸 \`.song <song name>\` - Download MP3 Songs\n` +
                                 `🛸 \`.video <video name>\` - Download YouTube Videos\n\n` +
                                 `*ℹ️ INFO COMMANDS:*\n` +
                                 `🛸 \`.alive\` - Check Bot Status\n\n` +
                                 `✨ *Pure Soul Land Xiao Wu System* ✨`;

                await sock.sendMessage(from, { image: { url: botImageUrl }, caption: menuMsg }, { quoted: mek });
            }

            // 3. 🎶 SONG DOWNLOADER (Built-In Engine)
            if (command === "song") {
                if (!text) return reply(sock, from, "🐰 *කරුණාකර සිංදුවේ නම දෙන්න මචං!*", mek);
                await reply(sock, from, "📥 *Xiao Wu සිංදුව හොයනවා... පොඩ්ඩක් ඉන්න...* 🎵", mek);
                
                try {
                    const search = await youtube.search(text);
                    if (!search || search.length === 0) return reply(sock, from, "❌ *සිංදුව සොයාගත නොහැකි විය!*", mek);
                    
                    const videoUrl = search[0].url;
                    const stream = ytdl(videoUrl, { filter: 'audioonly', quality: 'highestaudio' });
                    
                    // Direct stream URL එකක් සෑදීම හෝ බාගත කිරීම
                    const info = await ytdl.getInfo(videoUrl);
                    const format = ytdl.chooseFormat(info.formats, { quality: '140' }); // m4a audio format

                    if (format && format.url) {
                        await sock.sendMessage(from, { audio: { url: format.url }, mimetype: 'audio/mp4', ptt: false }, { quoted: mek });
                    } else {
                        reply(sock, from, "❌ *සිංදුව බාගැනීමට නොහැකි විය. පසුව උත්සාහ කරන්න.*", mek);
                    }
                } catch (e) {
                    reply(sock, from, "❌ *සිංදුව සෙවීමේදී දෝෂයක් ඇති විය.*", mek);
                }
            }

            // 4. 📹 VIDEO DOWNLOADER (Built-In Engine)
            if (command === "video") {
                if (!text) return reply(sock, from, "🐰 *කරුණාකර වීඩියෝවේ නම දෙන්න!*", mek);
                await reply(sock, from, "📥 *Xiao Wu වීඩියෝව හොයනවා... පොඩ්ඩක් ඉන්න...* 📹", mek);
                
                try {
                    const search = await youtube.search(text);
                    if (!search || search.length === 0) return reply(sock, from, "❌ *වීඩියෝව සොයාගත නොහැකි විය!*", mek);
                    
                    const videoUrl = search[0].url;
                    const info = await ytdl.getInfo(videoUrl);
                    const format = ytdl.chooseFormat(info.formats, { quality: '18' }); // 360p mp4 video format

                    if (format && format.url) {
                        await sock.sendMessage(from, { video: { url: format.url }, caption: `🐰 *මෙන්න ඔයාගේ වීඩියෝව!* 🌸\n\n🎬 *Title:* ${search[0].title}` }, { quoted: mek });
                    } else {
                        reply(sock, from, "❌ *වීඩියෝව බාගැනීමට නොහැකි විය.*", mek);
                    }
                } catch (e) {
                    reply(sock, from, "❌ *වීඩියෝව සෙවීමේදී දෝෂයක් ඇති විය.*", mek);
                }
            }

        } catch (error) {
            console.error("❌ Process Error:", error.message);
        }
    });

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "open") {
            console.log("\n🌸 PURE XIAO WU NO-API BOT IS ONLINE!");
        }
        if (connection === "close") {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
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
