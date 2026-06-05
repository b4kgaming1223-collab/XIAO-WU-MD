const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay } = require("@whiskeysockets/baileys");
const P = require("pino");
const readline = require("readline");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState("./xiao_wu_session");

    const sock = makeWASocket({
        auth: state,
        logger: P({ level: "silent" }),
        printQRInTerminal: false,
        keepAliveIntervalMs: 30000, // 🔄 සර්වර් එකට හැම තත්පර 30ටම පින් එකක් යවනවා කනෙක්ෂන් එක තියාගන්න
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
            // ⚠️ 428 එරර් එක ආවොත් ලූප් වෙන්න නොදී තත්පර 5ක් ඉඳලා විතරක් රීකනෙක්ට් වෙනවා
            console.log(`\n⚠️ Connection closed (Reason: ${reason}), Retrying in 5s...`);
            await delay(5000);
            connectToWhatsApp();
        }
    });

    if (!sock.authState.creds.registered) {
        console.log("\n🐰 Xiao Wu සර්වර් එක ස්ටේබල් වෙනකම් තත්පර 8ක් ඉන්නවා...");
        await delay(8000); 
        
        console.log("\n✨ සර්වර් එක සූදානම්!");
        const phoneNumber = await question('\n👉 WhatsApp නම්බර් එක රටේ කෝඩ් එකත් එක්කම ගහන්න (උදා: 947XXXXXXXX): ');
        
        try {
            console.log("\n⏳ Pairing Code එක ඉල්ලනවා... පොඩ්ඩක් ඉන්න...");
            const code = await sock.requestPairingCode(phoneNumber.trim());
            console.log(`\n💖 XIAO WU PAIRING CODE: ${code}`);
            console.log("👉 මේ කෝඩ් එක වට්ස්ඇප් එකට දාන්න!\n");
        } catch (err) {
            console.log("\n❌ එරර් එකක් ආවා. ආයෙත් 'npm start' දීලා බලමු.");
        }
    }
}

connectToWhatsApp();
