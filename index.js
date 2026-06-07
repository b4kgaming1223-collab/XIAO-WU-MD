const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay } = require("gifted-baileys");
const P = require("pino");
const axios = require("axios");
const config = require("./config"); 

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState("./xiao_wu_session");

    const sock = makeWASocket({
        auth: state,
        logger: P({ level: "silent" }),
        printQRInTerminal: false,
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    sock.ev.on("creds.update", saveCreds);

    // 💬 වට්ස්ඇප් මැසේජ් ලැබෙන සහ කමාන්ඩ්ස් ක්‍රියාත්මක වන කොටස
    sock.ev.on("messages.upsert", async (chatUpdate) => {
        try {
            const mek = chatUpdate.messages[0];
            if (!mek.message) return;
            if (mek.key.fromMe) return; 

            const from = mek.key.remoteJid;
            const type = Object.keys(mek.message)[0];
            const body = type === "conversation" ? mek.message.conversation : 
                         type === "extendedTextMessage" ? mek.message.extendedTextMessage.text : "";

            // කමාන්ඩ්ස් හඳුනාගැනීම (Prefix: . හෝ /)
            const isCmd = body.startsWith(".") || body.startsWith("/");
            if (!isCmd) return;

            const command = body.slice(1).trim().split(/ +/).shift().toLowerCase();
            const args = body.trim().split(/ +/).slice(1);
            const text = args.join(" ");

            console.log(`🚀 Command received: ${command} | Args: ${text}`);

            // 1. 🌸 ALIVE COMMAND (.alive)
            if (command === "alive") {
                const aliveMsg = `🐰 *XIAO WU WHATSAPP BOT* 🌸\n\n` +
                                 `*Hello San-ge! Im Alive and Running Smoothly...* 💞\n\n` +
                                 `🤖 *Version:* 1.0.0\n` +
                                 `⚙️ *Platform:* GitHub Codespaces\n` +
                                 `💎 *API Status:* Premium Connected\n\n` +
                                 `*Use .menu to see what I can do for you!* ⚔️`;
                
                // ලස්සන ඇලයිව් මැසේජ් එකක් ෆොටෝ එකක් එක්ක යවනවා
                await sock.sendMessage(from, { 
                    image: { url: "https://i.ibb.co/dJMB66cZ/20250801-234253.jpg" }, 
                    caption: aliveMsg 
                }, { quoted: mek });
            }

            // 2. 📜 MENU COMMAND (.menu)
            if (command === "menu") {
                const menuMsg = `🐰 *XIAO WU BOT MAIN MENU* 🌸\n\n` +
                                 `⚔️ *Owner:* Liyo\n` +
                                 `🌸 *Prefix:* [ . ]\n\n` +
                                 `*🎵 DOWNLOAD COMMANDS:*\n` +
                                 `🛸 \`.song <song name>\` - Download MP3 Songs\n` +
                                 `🛸 \`.video <video name>\` - Download YouTube Videos\n\n` +
                                 `*🎨 AI & IMAGE COMMANDS:*\n` +
                                 `🛸 \`.imagine <prompt>\` - AI Image Generator\n\n` +
                                 `*ℹ️ INFO COMMANDS:*\n` +
                                 `🛸 \`.alive\` - Check Bot Status\n\n` +
                                 `✨ *Pure Soul Land Xiao Wu System* ✨`;

                await sock.sendMessage(from, { 
                    image: { url: "https://i.ibb.co/dJMB66cZ/20250801-234253.jpg" }, 
                    caption: menuMsg 
                }, { quoted: mek });
            }

            // 3. 🎶 SONG DOWNLOADER (.song)
            if (command === "song") {
                if (!text) return reply(sock, from, "🐰 *කරුණාකර සිංදුවේ නම ඇතුළත් කරන්න මචං! (උදා: .song mal mitak)*", mek);
                
                await reply(sock, from, "📥 *Xiao Wu සිංදුව හොයනවා... පොඩ්ඩක් ඉන්න...* 🎵", mek);
                
                try {
                    // Ryuu YTAudio Downloader API
                    const searchUrl = `https://api.ryuu.me/api/download/ytaudio?text=${encodeURIComponent(text)}&apiKey=${config.RYUU_API_KEY}`;
                    const res = await axios.get(searchUrl);
                    const downloadUrl = res.data.result;

                    if (!downloadUrl) return reply(sock, from, "❌ *සිංදුව සොයාගත නොහැකි විය.*", mek);

                    // ඕඩියෝ එක වට්ස්ඇප් එකට යවනවා
                    await sock.sendMessage(from, { 
                        audio: { url: downloadUrl }, 
                        mimetype: 'audio/mp4', 
                        ptt: false 
                    }, { quoted: mek });

                } catch (e) {
                    console.error(e);
                    reply(sock, from, "❌ *සිංදුව ඩවුන්ලෝඩ් කිරීමේදී දෝෂයක් ඇති විය.*", mek);
                }
            }

            // 4. 📹 VIDEO DOWNLOADER (.video)
            if (command === "video") {
                if (!text) return reply(sock, from, "🐰 *කරුණාකර වීඩියෝවේ නම ඇතුළත් කරන්න මචං!*", mek);
                
                await reply(sock, from, "📥 *Xiao Wu වීඩියෝව හොයනවා... පොඩ්ඩක් ඉන්න...* 📹", mek);
                
                try {
                    // Ryuu YTVideo Downloader API
                    const searchUrl = `https://api.ryuu.me/api/download/ytvideo?text=${encodeURIComponent(text)}&apiKey=${config.RYUU_API_KEY}`;
                    const res = await axios.get(searchUrl);
                    const downloadUrl = res.data.result;

                    if (!downloadUrl) return reply(sock, from, "❌ *වීඩියෝව සොයාගත නොහැකි විය.*", mek);

                    await sock.sendMessage(from, { 
                        video: { url: downloadUrl }, 
                        caption: "🐰 *මෙන්න ඔයාගේ වීඩියෝව!* 🌸" 
                    }, { quoted: mek });

                } catch (e) {
                    console.error(e);
                    reply(sock, from, "❌ *වීඩියෝව ඩවුන්ලෝඩ් කිරීමේදී දෝෂයක් ඇති විය.*", mek);
                }
            }

            // 5. 🎨 AI IMAGE GENERATOR (.imagine)
            if (command === "imagine") {
                if (!text) return reply(sock, from, "🐰 *කරුණාකර සාදාගත යුතු පින්තූරයේ විස්තරයක් දෙන්න! (උදා: .imagine cute rabbit)*", mek);
                
                await reply(sock, from, "🎨 *Xiao Wu පින්තූරය අඳිනවා... පොඩ්ඩක් ඉන්න...* 🐇", mek);
                
                try {
                    // Ryuu Text-to-Image API
                    const imgUrl = `https://api.ryuu.me/api/ai/imagine?text=${encodeURIComponent(text)}&apiKey=${config.RYUU_API_KEY}`;
                    
                    await sock.sendMessage(from, { 
                        image: { url: imgUrl }, 
                        caption: `🐰 *Generated by Xiao Wu AI* 🌸\n\n✨ *Prompt:* ${text}` 
                    }, { quoted: mek });

                } catch (e) {
                    console.error(e);
                    reply(sock, from, "❌ *පින්තූරය සෑදීමේදී දෝෂයක් ඇති විය.*", mek);
                }
            }

        } catch (error) {
            console.error("❌ Main Process Error:", error.message);
        }
    });

    // 🔄 කනෙක්ෂන් අප්ඩේට් එක
    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "open") {
            console.log("\n🌸 PURE XIAO WU CONECTED WITH MULTI-COMMANDS!");
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

// 헬පර් function එකක් රිප්ලයි ලේසි කරන්න
async function reply(sock, from, text, mek) {
    return await sock.sendMessage(from, { text: text }, { quoted: mek });
}

connectToWhatsApp();
