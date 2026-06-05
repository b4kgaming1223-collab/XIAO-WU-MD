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
        printQRInTerminal: false // QR එක ඕන නෑ, අපි Pairing Code ගමු!
    });

    // 📱 ඔයා කලින් කනෙක්ට් වෙලා නැත්නම් විතරක් Phone Number එක අහනවා
    if (!sock.authState.creds.registered) {
        console.log("\n🐰 XIAO WU WAITING FOR YOUR NUMBER...");
        await delay(3000); // පොඩි වෙලාවක් ඉන්නවා සිස්ටම් එක රෙඩි වෙනකම්
        
        // ටර්මිනල් එකේ ඔයාගේ නම්බර් එක ඉල්ලනවා (උදා: 94771234567)
        const phoneNumber = await question('\n👉 ඔයාගේ WhatsApp නම්බර් එක රටේ කෝඩ් එකත් එක්කම ගහන්න (Example: 947XXXXXXXX): ');
        const code = await sock.requestPairingCode(phoneNumber.trim());
        
        console.log(`\n💖 XIAO WU PAIRING CODE: ${code}`);
        console.log("👉 මේ කෝඩ් එක කොපි කරගෙන, ඔයාගේ WhatsApp -> Linked Devices -> Link with phone number ගිහින් දාන්න!\n");
    }

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === "open") {
            console.log("\n🌸 XIAO WU CONNECTED SUCCESSFULLY!");
            rl.close();
        }
        
        if (connection === "close") {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) connectToWhatsApp();
        }
    });
}

connectToWhatsApp();
