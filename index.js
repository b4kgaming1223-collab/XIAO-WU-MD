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
        printQRInTerminal: false
    });

    sock.ev.on("creds.update", saveCreds);

    // 🔄 කනෙක්ෂන් එකේ තත්ත්වය බලාගන්න එක මෙතනින් කරනවා
    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === "open") {
            console.log("\n🌸 XIAO WU CONNECTED SUCCESSFULLY!");
            rl.close();
        }
        
        if (connection === "close") {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log("\n⚠️ Connection closed, reconnecting...");
            if (shouldReconnect) connectToWhatsApp();
        }
    });

    // 📱 සර්වර් එක ස්ටේබල් වෙනකම් තත්පර 6ක් ඉඳලා තමයි නම්බර් එක ඉල්ලන්නේ
    if (!sock.authState.creds.registered) {
        console.log("\n🐰 Xiao Wu සර්වර් එකට සම්බන්ධ වෙනවා... පොඩ්ඩක් ඉන්න...");
        await delay(6000); // 428 එරර් එක එන එක නවත්තන්න මේ Delay එක උදව් වෙනවා
        
        console.log("\n✨ සර්වර් එක සූදානම්!");
        const phoneNumber = await question('\n👉 ඔයාගේ WhatsApp නම්බර් එක රටේ කෝඩ් එකත් එක්කම ගහන්න (උදා: 94771234567): ');
        
        try {
            const code = await sock.requestPairingCode(phoneNumber.trim());
            console.log(`\n💖 XIAO WU PAIRING CODE: ${code}`);
            console.log("👉 මේ කෝඩ් එක කොපි කරගෙන, ඔයාගේ WhatsApp -> Linked Devices -> Link with phone number ගිහින් දාන්න!\n");
        } catch (err) {
            console.log("\n❌ කෝඩ් එක ගන්න බැරි වුණා. ආයෙත් 'npm start' දීලා බලන්න.", err.message);
        }
    }
}

connectToWhatsApp();
