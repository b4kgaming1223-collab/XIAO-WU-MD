const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
const P = require("pino");

async function connectToWhatsApp() {
    // 📂 සෙෂන් ඩේටා සේව් වෙන්න අලුත් ෆෝල්ඩර් එකක් හැදෙනවා
    const { state, saveCreds } = await useMultiFileAuthState("./xiao_wu_session");

    const sock = makeWASocket({
        auth: state,
        logger: P({ level: "silent" }),
        printQRInTerminal: true // Terminal එකේ QR එක බලාගන්න මේක true කරනවා
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === "open") {
            console.log("\n🌸 XIAO WU CONNECTED SUCCESSFULLY!");
        }
        
        if (connection === "close") {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) connectToWhatsApp();
        }
    });
}

connectToWhatsApp();
