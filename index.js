const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay } = require("gifted-baileys");
const P = require("pino");
const axios = require("axios");
const config = require("./config"); 

async function connectToWhatsApp() {
    if (!config.RYUU_API_KEY || config.RYUU_API_KEY === "") {
        console.error("\n❌ ERROR: කරුණාකර config.js ෆයිල් එකේ RYUU_API_KEY එක දාන්න මචං!");
        process.exit(1);
    }
    if (config.MY_NUMBER === "947XXXXXXXX" || !config.MY_NUMBER) {
        console.error("\n❌ ERROR: කරුණාකර config.js ෆයිල් එකේ MY_NUMBER එකට ඔයාගේ ඇත්තම නම්බර් එක දාන්න මචං!");
        process.exit(1);
    }

    // 🔒 ඔටෝම සෙෂන් එක පිරිසිදුව හදාගන්නවා
    const { state, saveCreds } = await useMultiFileAuthState("./xiao_wu_session");

    const sock = makeWASocket({
        auth: state,
        logger: P({ level: "silent" }),
        printQRInTerminal: false,
        browser: ["Ubuntu", "Chrome", "20.0.04"] // 🌐 සර්වර් එකට අපි Chrome browser එකක් වගේ පේන්න සැලැස්සුවා
    });

    sock.ev.on("creds.update", saveCreds);

    // 💬 වට්ස්ඇප් මැසේජ් ලැබෙන කොටස
    sock.ev.on("messages.upsert", async (chatUpdate) => {
        try {
            const mek = chatUpdate.messages[0];
            if (!mek.message) return;
            if (mek.key.fromMe) return; 

            const from = mek.key.remoteJid;
            const type = Object.keys(mek.message)[0];
            const body = type === "conversation" ? mek.message.conversation : 
                         type === "extendedTextMessage" ? mek.message.extendedTextMessage.text : "";

            if (!body) return;

            console.log(`📩 Message received: ${body}`);
            await sock.sendMessage(from, { text: "🐰 *Xiao Wu හිතනවා... පොඩ්ඩක් ඉන්න...*" }, { quoted: mek });

            const ryuuUrl = `https://api.ryuu.me/api/ai/gemini?text=${encodeURIComponent(body)}&prompt=${encodeURIComponent(config.PURE_XIAO_WU_PROMPT)}&apiKey=${config.RYUU_API_KEY}`;
            const response = await axios.get(ryuuUrl);
            
            const xiaoWuReply = response.data.result || "අනේ මට ඒක තේරුණේ නෑ යාළුවා... 🫣";
            await sock.sendMessage(from, { text: `🐰 *XIAO WU* 🌸\n\n${xiaoWuReply}` }, { quoted: mek });

        } catch (error) {
            console.error("❌ Gemini API Error:", error.message);
        }
    });

    // 🔄 කනෙක්ෂන් අප්ඩේට් එක
    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "open") {
            console.log("\n🌸 PURE XIAO WU CONNECTED SUCCESSFULLY!");
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

    // 🔑 Gifted Pairing Code Generator (Super Fast & Stable)
    if (!sock.authState.creds.registered) {
        console.log(`\n🐰 Xiao Wu සර්වර් එකට සම්බන්ධ වෙනවා... නම්බර් එක: ${config.MY_NUMBER}`);
        await delay(5000); // ⏳ තත්පර 5ක සරල ඩිලේ එකක්
        
        try {
            let clearedNumber = config.MY_NUMBER.replace(/[^0-9]/g, ""); // නම්බර් එකේ වෙනත් ලකුණු තියෙනවා නම් අයින් කරනවා
            const code = await sock.requestPairingCode(clearedNumber);
            console.log("\n==============================================");
            console.log(`💖 XIAO WU PAIRING CODE: ${code}`);
            console.log("==============================================");
            console.log("👉 මේ කෝඩ් එක ඉක්මනින්ම කොපි කරගෙන, වට්ස්ඇප් එකට ලින්ක් කරන්න!\n");
        } catch (err) {
            console.log("\n❌ කෝඩ් එක ගන්න බැරි වුණා. ආයෙත් 'npm start' දීලා බලන්න.", err.message);
        }
    }
}

connectToWhatsApp();
