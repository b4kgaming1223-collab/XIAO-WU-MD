require('dotenv').config(); // 🔒 රහස් ෆයිල් එක කියවන්න මේක උඩින්ම දාන්න ඕනේ
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay } = require("@whiskeysockets/baileys");
const P = require("pino");
const readline = require("readline");
const axios = require("axios");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

// 🔒 API Key එක දැන් සුරක්ෂිතයි. කෙලින්ම කෝඩ් එකේ පේන්න නැහැ!
const RYUU_API_KEY = process.env.RYUU_API_KEY; 

const PURE_XIAO_WU_PROMPT = "You are the real Xiao Wu from the anime Soul Land (Douluo Dalu). You are a 100,000-year-old Soft Bone Rabbit transformed into a human. Your deepest love and devotion belong to Tang San (San-ge). Act exactly like her: playful, energetic, fiercely protective of your loved ones, cute, and sweet, but a strong spirit master. You must reply in friendly, cute, and sweet Sinhala language. Use emojis like 🐰, 🐇, 🌸, 💖, ⚔️ naturally. Treat the user like a close companion in the Soul Land world. Never mention you are an AI or robot. Your creator/owner is Liyo.";

async function connectToWhatsApp() {
    // API Key එක හරියට දාලා නැත්නම් බොට් ස්ටාර්ට් වෙන්නේ නැති වෙන්න ආරක්ෂාව දැම්මා
    if (!RYUU_API_KEY) {
        console.error("\n❌ ERROR: .env ෆයිල් එකේ RYUU_API_KEY එක දාලා නැහැ මචං! ඒක දාලා ආයෙත් රන් කරන්න.");
        process.exit(1);
    }

    const { state, saveCreds } = await useMultiFileAuthState("./xiao_wu_session");

    const sock = makeWASocket({
        auth: state,
        logger: P({ level: "silent" }),
        printQRInTerminal: false
    });

    sock.ev.on("creds.update", saveCreds);

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

            const ryuuUrl = `https://api.ryuu.me/api/ai/gemini?text=${encodeURIComponent(body)}&prompt=${encodeURIComponent(PURE_XIAO_WU_PROMPT)}&apiKey=${RYUU_API_KEY}`;
            const response = await axios.get(ryuuUrl);
            
            const xiaoWuReply = response.data.result || "අනේ මට ඒක තේරුණේ නෑ යාළුවා... 🫣";
            await sock.sendMessage(from, { text: `🐰 *XIAO WU* 🌸\n\n${xiaoWuReply}` }, { quoted: mek });

        } catch (error) {
            console.error("❌ Gemini API Error:", error.message);
        }
    });

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "open") {
            console.log("\n🌸 PURE XIAO WU CONNECTED SUCCESSFULLY!");
            rl.close();
        }
        if (connection === "close") {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log("\n⚠️ Connection closed, reconnecting...");
            if (shouldReconnect) connectToWhatsApp();
        }
    });

    if (!sock.authState.creds.registered) {
        console.log("\n🐰 Xiao Wu සර්වර් එකට සම්බන්ධ වෙනවා... පොඩ්ඩක් ඉන්න...");
        await delay(4000); 
        
        const phoneNumber = await question('\n👉 ඔයාගේ WhatsApp නම්බර් එක රටේ කෝඩ් එකත් එක්කම ගහන්න (උදා: 947XXXXXXXX): ');
        
        try {
            const code = await sock.requestPairingCode(phoneNumber.trim());
            console.log(`\n💖 XIAO WU PAIRING CODE: ${code}`);
            console.log("👉 මේ කෝඩ් එක කොපි කරගෙන, WhatsApp -> Linked Devices -> Link with phone number ගිහින් දාන්න!\n");
        } catch (err) {
            console.log("\n❌ කෝඩ් එක ගන්න බැරි වුණා. ආයෙත් 'npm start' දීලා බලන්න.");
        }
    }
}

connectToWhatsApp();
