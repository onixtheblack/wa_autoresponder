require('dotenv').config();
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const Database = require('better-sqlite3');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// IMPORTAMOS EL CEREBRO
const cerebro = require('./cerebro');

// ==============================================================================
// 1. CONFIGURACIÓN
// ==============================================================================
const CLAVE_ADMIN = "admin123"; 
const ASSETS_PATH = path.join(__dirname, 'src', 'assets');
if (!fs.existsSync(ASSETS_PATH)) fs.mkdirSync(ASSETS_PATH, { recursive: true });

// Base de Datos
const db = new Database('memoria.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS processed_messages (id TEXT PRIMARY KEY, timestamp INTEGER);
  CREATE TABLE IF NOT EXISTS blocked_users (phone TEXT PRIMARY KEY);
`);
const insertMessage = db.prepare('INSERT OR IGNORE INTO processed_messages (id, timestamp) VALUES (?, ?)');
const checkMessage = db.prepare('SELECT id FROM processed_messages WHERE id = ?');
const blockUser = db.prepare('INSERT OR IGNORE INTO blocked_users (phone) VALUES (?)');
const checkBlocked = db.prepare('SELECT phone FROM blocked_users WHERE phone = ?');

// Telegram
const TelegramBot = require('node-telegram-bot-api');
const tBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
const ADMIN_ID = parseInt(process.env.TELEGRAM_ADMIN_ID);
const GROUP_ID = process.env.TELEGRAM_GROUP_ID;

// Cliente WhatsApp
const client = new Client({ authStrategy: new LocalAuth(), puppeteer: { args: ['--no-sandbox'] } });

// Variables Globales
const messageBuffers = new Map();
const clientState = new Map(); 
let isReady = false; 
let botReadyTime = 0; 
let tasaBCV = 60.00;
const INSULTOS = ["estafa", "ladrón", "ladron", "rata", "maldito", "maldita", "basura", "mierda", "csm", "mamaguevo", "estafadores", "robo", "coño", "mmg"];

// ==============================================================================
// 2. HERRAMIENTAS EJECUTIVAS
// ==============================================================================
async function actualizarTasaBCV() {
    try {
        const res = await axios.get('https://ve.dolarapi.com/v1/dolares/oficial');
        if (res.data?.promedio) {
            tasaBCV = parseFloat(res.data.promedio).toFixed(2);
            console.log(`💵 Tasa BCV: ${tasaBCV}`);
        }
    } catch (e) { console.error("⚠️ Error Tasa BCV"); }
}
actualizarTasaBCV();
setInterval(actualizarTasaBCV, 3600000);

function procesarCalculoMatematico(textoIA) {
    // Busca [CALCULAR_BS: 50] y lo reemplaza por el monto real
    const regex = /\[CALCULAR_BS:\s*(\d+(?:\.\d+)?)\]/g;
    return textoIA.replace(regex, (match, montoStr) => {
        const monto = parseFloat(montoStr);
        if (isNaN(monto)) return match;
        const enBs = (monto * tasaBCV).toLocaleString('es-VE', { minimumFractionDigits: 2 });
        const enUSDT = (monto * 0.50).toFixed(2);
        return `Bs. ${enBs} (Tasa BCV: ${tasaBCV}) | USDT: ${enUSDT} (50% OFF)`;
    });
}

const sleep = (min, max) => new Promise(r => setTimeout(r, Math.floor(Math.random() * (max - min + 1) + min)));

async function notificarPagoTelegram(tipo, buffer, captionText) {
    try {
        if (buffer) await tBot.sendPhoto(GROUP_ID, buffer, { caption: captionText });
        else await tBot.sendMessage(GROUP_ID, `💰 ${captionText}`);
        await tBot.sendMessage(ADMIN_ID, `🔔 ${tipo} Recibido.`);
    } catch (e) {}
}

async function enviarImagenLocal(telefono, nombreArchivo) {
    const filePath = path.join(ASSETS_PATH, nombreArchivo);
    if (fs.existsSync(filePath)) {
        const media = MessageMedia.fromFilePath(filePath);
        await client.sendMessage(telefono, media);
    } else {
        await client.sendMessage(telefono, "⚠️ (Imagen cargando, use texto arriba).");
    }
}

// ==============================================================================
// 3. PROCESADOR PRINCIPAL (COORDINADOR)
// ==============================================================================
async function coordinarRespuesta(telefono) {
    const buffer = messageBuffers.get(telefono);
    if (!buffer) return;
    messageBuffers.delete(telefono);

    // A. GESTIÓN DE ESTADO (MEMORIA DE SESIÓN)
    if (!clientState.has(telefono)) {
        clientState.set(telefono, { 
            paso: 'INICIO', metodo: null, datos: new Set(), 
            saludo_enviado: false, catalog_sent: false 
        });
    }
    const estado = clientState.get(telefono);

    // B. SEGURIDAD (ANTI-INSULTOS)
    const txtLower = buffer.texto.toLowerCase();
    if (INSULTOS.some(i => txtLower.includes(i))) {
        await client.sendMessage(telefono, "Si va a ofender o insultar solo porque no le gusta la promoción, entonces no se moleste en escribir, no está obligado a comprar, sus datos pasarán a una base de datos feliz día 👋.");
        blockUser.run(telefono);
        clientState.delete(telefono);
        return;
    }

    const chat = await client.getChatById(telefono);
    await chat.sendStateTyping();
    await sleep(2000, 3000);

    // C. ACTUALIZACIÓN DE DATOS (Solo en fase Requisitos)
    if (estado.paso === 'REQUISITOS') {
        if (txtLower.includes("calle") || txtLower.includes("casa") || txtLower.includes("av") || txtLower.includes("municipio")) estado.datos.add("direccion");
        if (buffer.tieneVideo) estado.datos.add("video");
        if (/\d{6,8}/.test(txtLower) || buffer.mediaData) estado.datos.add("cedula");
    }

    // D. LLAMADA AL CEREBRO (ULTRONIA)
    const hora = parseInt(new Date().toLocaleTimeString('es-VE', {timeZone:'America/Caracas', hour:'2-digit', hour12:false}));
    
    // Empaquetamos todo el contexto para el cerebro
    const contexto = {
        tasa: tasaBCV,
        hora: hora,
        estado: estado,
        esOrden: buffer.esOrden,
        tieneVideo: buffer.tieneVideo,
        tieneFoto: (buffer.mimeType && buffer.mimeType.startsWith('image/')),
        imgBase64: buffer.mediaData, // Puede ser null si es reenviada
        mimeType: buffer.mimeType,
        saludo_enviado: estado.saludo_enviado,
        catalog_sent: estado.catalog_sent
    };

    let respuestaIA = await cerebro.procesarIntencion([], buffer.texto, contexto);

    // E. EJECUCIÓN DE HERRAMIENTAS (BODY ACTIONS)

    // 1. CÁLCULO MATEMÁTICO
    if (respuestaIA.includes("[CALCULAR_BS:")) {
        respuestaIA = procesarCalculoMatematico(respuestaIA);
    }

    // 2. ACTUALIZAR FLAGS DE ESTADO
    if (respuestaIA.includes("[CATALOG_SENT]")) estado.catalog_sent = true;
    if (respuestaIA.includes("[SET_PM]")) { estado.metodo = 'pm'; estado.paso = 'REQUISITOS'; }
    if (respuestaIA.includes("[SET_TRANSF]")) { estado.metodo = 'transf'; estado.paso = 'REQUISITOS'; }
    if (respuestaIA.includes("[SET_USDT]")) { estado.metodo = 'usdt'; estado.paso = 'REQUISITOS'; }

    // 3. CIERRE EFECTIVO
    if (respuestaIA.includes("[CLOSE_CASH]")) {
        await client.sendMessage(telefono, respuestaIA.replace("[CLOSE_CASH]", ""));
        clientState.delete(telefono);
        return;
    }

    // 4. POLICÍA DE REQUISITOS (HARDCODE)
    if (respuestaIA.includes("[TRIGGER_CHECK_COMPLETE]")) {
        const tCedula = estado.datos.has("cedula");
        const tDirec = estado.datos.has("direccion");
        const tVideo = estado.datos.has("video");
        let ok = false;

        if (estado.metodo === 'usdt') ok = (tCedula && tDirec);
        else ok = (tCedula && tDirec && tVideo);

        if (ok) {
            estado.paso = 'CONFIRMACION';
            // Volvemos a llamar al cerebro para que genere el ultimátum
            const newContext = {...contexto}; // Copia
            const msgUlt = await cerebro.procesarIntencion([], "TRIGGER_ULTIMATUM", newContext);
            await client.sendMessage(telefono, msgUlt.replace("[TRIGGER_PAYMENT_SEND]", ""));
        } else {
            let falta = [];
            if (!tCedula) falta.push("Foto Cédula");
            if (!tDirec) falta.push("Dirección");
            if (!tVideo && estado.metodo !== 'usdt') falta.push("VIDEO");
            await client.sendMessage(telefono, `Disculpe, falta validar: ${falta.join(" + ")}. Por favor envíelo.`);
        }
        return;
    }

    // 5. ENVÍO DE PAGO
    if (respuestaIA.includes("[TRIGGER_PAYMENT_SEND]")) {
        if (estado.paso !== 'CONFIRMACION') {
            await client.sendMessage(telefono, "Confirme condiciones primero. ☝️");
            return;
        }

        let clean = respuestaIA.replace("[TRIGGER_PAYMENT_SEND]", "").trim();
        if (clean) await client.sendMessage(telefono, clean);

        if (estado.metodo === 'usdt') {
            const txt = `Total a Pagar: USDT 🪙\nRed BSC BEP-20\nDirección:\n0x6253583241337456B1C82452C2B430241c2c80bC\n\n(Capture por favor 👍)`;
            await client.sendMessage(telefono, txt);
            await enviarImagenLocal(telefono, "usdtqr.jpg");
        } else {
            await client.sendMessage(telefono, "Información recibida. Enviando datos...");
            await sleep(3000, 4000);
            const img = estado.metodo === 'pm' ? "pago_movil.jpg" : "transferencia.jpg";
            await enviarImagenLocal(telefono, img);
        }
        estado.paso = 'PAGO';
        setTimeout(async () => {
            if (clientState.has(telefono)) await client.sendMessage(telefono, "¿Todo bien con el pago? ⏳");
        }, 10 * 60 * 1000);
        return;
    }

    // 6. RESPUESTA FINAL
    let final = respuestaIA.replace(/\[.*?\]/g, "").trim();
    if (final) {
        await client.sendMessage(telefono, final);
        estado.saludo_enviado = true;
    }

    // 7. RECEPCIÓN PAGO
    if (estado.paso === 'PAGO' && (buffer.mediaData || buffer.texto.toLowerCase().includes("listo"))) {
        let tipo = estado.metodo === 'usdt' ? "USDT" : "Bolívares";
        if (buffer.mediaData) await notificarPagoTelegram(tipo, Buffer.from(buffer.mediaData, 'base64'), "Credito");
        else await notificarPagoTelegram(tipo, null, "Credito (Texto)");
        
        await client.sendMessage(telefono, "Información recibida, verificando...");
        clientState.delete(telefono);
    }
}

// ==============================================================================
// 4. EVENTOS Y ARRANQUE
// ==============================================================================
client.on('qr', (qr) => qrcode.generate(qr, { small: true }));

client.on('ready', () => {
    console.log('🔗 UltronIA Conectada.');
    console.log('🛡️ Iniciando Cuarentena 5 min...');
    setTimeout(() => {
        botReadyTime = Math.floor(Date.now() / 1000); 
        isReady = true; 
        console.log(`✅ ULTRONIA V26 ACTIVA.`);
    }, 5 * 60 * 1000); 
});

client.on('message', async msg => {
    // ADMIN UPLOAD
    if (msg.body.startsWith(`!${CLAVE_ADMIN}`)) {
        if (!msg.hasMedia) return msg.reply("❌ Falta foto.");
        const c = msg.body.toLowerCase();
        let f = "";
        if (c.includes("pm")) f = "pago_movil.jpg";
        else if (c.includes("transf")) f = "transferencia.jpg";
        else if (c.includes("usdt")) f = "usdtqr.jpg";
        else return msg.reply("❌ Comandos: !admin123 pm | transf | usdt");
        try {
            const m = await msg.downloadMedia();
            fs.writeFileSync(path.join(ASSETS_PATH, f), m.data, 'base64');
            return msg.reply(`✅ Imagen ${f} guardada.`);
        } catch (e) { return msg.reply("Error: " + e.message); }
    }

    if (!isReady) return;
    if (msg.timestamp < botReadyTime) return;
    if (checkBlocked.get(msg.from)) return;
    const h = parseInt(new Date().toLocaleTimeString('es-VE', {timeZone:'America/Caracas', hour:'2-digit', hour12:false}));
    if (h < 8 || h >= 22) return;
    if (checkMessage.get(msg.id.id)) return;
    insertMessage.run(msg.id.id, msg.timestamp);
    if (msg.fromMe || msg.isStatus) return;
    if (msg.type === 'ptt' || msg.type === 'audio') return client.sendMessage(msg.from, "No notas de voz. ✍️");

    const tel = msg.from;
    if (!messageBuffers.has(tel)) messageBuffers.set(tel, { texto: "", mediaData: null, mimeType: null, timer: null, esOrden: false, tieneVideo: false });
    const buf = messageBuffers.get(tel);

    if (msg.type === 'order') {
        buf.esOrden = true;
        try { const o = await msg.getOrder(); buf.texto += `[ORDEN: ${o.products.map(p=>p.name).join(", ")}] `; } 
        catch(e) { buf.texto += "[ORDEN WA] "; }
    } else if (msg.body) buf.texto += msg.body + " ";

    if (msg.hasMedia) {
        try {
            const m = await msg.downloadMedia();
            if (m) {
                if (m.mimetype.startsWith('video/')) buf.tieneVideo = true;
                else if (m.mimetype.startsWith('image/') && m.filesize < 20*1024*1024) {
                    buf.mediaData = m.data;
                    buf.mimeType = m.mimetype;
                }
                if (!buf.mimeType) buf.mimeType = m.mimetype;
            }
        } catch(e) { if (!buf.mimeType) buf.mimeType = "image/jpeg"; }
    }

    if (buf.timer) clearTimeout(buf.timer);
    buf.timer = setTimeout(() => coordinarRespuesta(tel), 7000);
});

client.initialize();
