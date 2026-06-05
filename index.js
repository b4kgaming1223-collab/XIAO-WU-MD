const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay } = require("@whiskeysockets/baileys");
const P = require("pino");
const readline = require("readline");
const NodeHttpsProxyAgent = require("https-proxy-agent").HttpsProxyAgent;

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState("./xiao_wu_session");

    // 🌐 Codespace එකේ බ්ලොක් එක කඩන්න නොමිලේ දෙන පොදු ප්‍රොක්සියක් පාවිච්චි කරනවා
    const proxyAgent = new NodeHttpsProxyAgent("http://45.152.188.246:3128");

    const sock = makeWASocket({
        auth: state,
        logger: P({ level: "silent" }),
        printQRInTerminal: false,
        agent: proxyAgent, // Proxy එක මෙතනට දානවා
        connectTimeoutMs: 60000
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === "open") {
            console.log("\n🌸 XIAO WU CONNECTED SUCCESSFULLY!");
            rl.close();
        }
        
        if (connection === "close") {
            const reason = lastDisconnect?.error?.output?.statusCode;
            console.log(`\n⚠️ Connection closed (${reason}). Reconnecting...`);
            await delay(5000);
            connectToWhatsApp();
        }
    });

    if (!sock.authState.creds.registered) {
        console.log("\n🐰 Xiao Wu Proxy එක හරහා සර්වර් එකට සම්බන්ධ වෙනවා...");
        await delay(5000); 
        
        const phoneNumber = await question('\n👉 WhatsApp නම්බර් එක රටේ කෝඩ් එකත් එක්කම ගහන්න (උදා: 947XXXXXXXX): ');
        
        try {
            console.log("\n⏳ Pairing Code එක ඉල්ලනවා...");
            const code = await sock.requestPairingCode(phoneNumber.trim());
            console.log(`\n💖 XIAO WU PAIRING CODE: ${code}`);
            console.log("👉 මේ කෝඩ් එක වට්ස්ඇප් එකට දාන්න!\n");
        } catch (err) {
            console.log("\n❌ Proxy අවුලක්. ආයෙත් 'npm start' දීලා බලමු.");
        }
    }
}

connectToWhatsApp();
