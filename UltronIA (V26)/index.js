require('dotenv').config();
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const Database = require('better-sqlite3');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cerebro = require('./cerebro'); // Conexión con la Mente

// ==============================================================================
// 1. CONFIGURACIÓN E INFRAESTRUCTURA
// ==============================================================================
const CLAVE_ADMIN = "admin123"; 
const ASSETS_PATH = path.join(__dirname, 'src', 'assets');
const LEARNING_PATH = path.join(__dirname, 'aprendizajes');

// Crear carpetas necesarias
if (!fs.existsSync(ASSETS_PATH)) fs.mkdirSync(ASSETS_PATH, { recursive: true });
if (!fs.existsSync(LEARNING_PATH)) fs.mkdirSync(LEARNING_PATH, { recursive: true });

// Base de Datos (Ahora guarda HISTORIAL DE CHAT)
const db = new Database('memoria_v26.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS processed_msgs (id TEXT PRIMARY KEY, timestamp INTEGER);
  CREATE TABLE IF NOT EXISTS blocked_users (phone TEXT PRIMARY KEY);
  CREATE TABLE IF NOT EXISTS chat_history (phone TEXT, role TEXT, content TEXT, timestamp INTEGER);
`);

const insertMsgId = db.prepare('INSERT OR IGNORE INTO processed_msgs (id, timestamp) VALUES (?, ?)');
const checkMsgId = db.prepare('SELECT id FROM processed_msgs WHERE id = ?');
const blockUser = db.prepare('INSERT OR IGNORE INTO blocked_users (phone) VALUES (?)');
const checkBlocked = db.prepare('SELECT phone FROM blocked_users WHERE phone = ?');

// Funciones de Historial
const addHistory = db.prepare('INSERT INTO chat_history (phone, role, content, timestamp) VALUES (?, ?, ?, ?)');
const getHistory = db.prepare('SELECT role, content FROM chat_history WHERE phone = ? ORDER BY timestamp ASC LIMIT 20'); // Trae los últimos 20

// Telegram y Cliente WA
const TelegramBot = require('node-telegram-bot-api');
const tBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
const ADMIN_ID = parseInt(process.env.TELEGRAM_ADMIN_ID);
const GROUP_ID = process.env.TELEGRAM_GROUP_ID;
const client = new Client({ authStrategy: new LocalAuth(), puppeteer: { args: ['--no-sandbox'] } });

// Variables RAM
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
    const regex = /\[CALCULAR_BS:\s*(\d+(?:\.\d+)?)\]/g;
    return textoIA.replace(regex, (match, montoStr) => {
        const monto = parseFloat(montoStr);
        if (isNaN(monto)) return match;
        const enBs = (monto * tasaBCV).toLocaleString('es-VE', { minimumFractionDigits: 2 });
        const enUSDT = (monto * 0.50).toFixed(2);
        return `Bs. ${enBs} (Tasa: ${tasaBCV}) | USDT: ${enUSDT} (50% OFF)`;
    });
}

function registrarAprendizaje(telefono, tipo, detalle) {
    const logFile = path.join(LEARNING_PATH, `${tipo}.json`);
    const data = { fecha: new Date().toISOString(), telefono, detalle };
    fs.appendFileSync(logFile, JSON.stringify(data) + ",\n");
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
        await client.sendMessage(telefono, "⚠️ (Imagen actualizándose, use texto arriba).");
    }
}

// ==============================================================================
// 3. COORDINADOR CENTRAL
// ==============================================================================
async function coordinarRespuesta(telefono) {
    const buffer = messageBuffers.get(telefono);
    if (!buffer) return;
    messageBuffers.delete(telefono);

    // 1. ESTADO
    if (!clientState.has(telefono)) {
        clientState.set(telefono, { 
            paso: 'INICIO', metodo: null, datos: new Set(), 
            saludo_enviado: false, catalog_sent: false 
        });
    }
    const estado = clientState.get(telefono);

    // 2. SEGURIDAD
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

    // 3. ACTUALIZAR REQUISITOS (Si aplica)
    if (estado.paso === 'REQUISITOS') {
        if (txtLower.includes("calle") || txtLower.includes("casa") || txtLower.includes("av") || txtLower.includes("municipio")) estado.datos.add("direccion");
        if (buffer.tieneVideo) estado.datos.add("video");
        if (/\d{6,8}/.test(txtLower) || buffer.mediaData) estado.datos.add("cedula");
    }

    // 4. PREPARAR CONTEXTO Y LLAMAR AL CEREBRO
    const historialDB = getHistory.all(telefono); // Obtener memoria de elefante
    
    // Guardamos el mensaje actual del usuario en DB antes de procesar
    let contenidoUserDB = buffer.texto;
    if (buffer.mediaData) contenidoUserDB += " [FOTO/VIDEO ENVIADO]";
    addHistory.run(telefono, 'user', contenidoUserDB, Date.now());

    const contexto = {
        tasa: tasaBCV,
        hora: parseInt(new Date().toLocaleTimeString('es-VE', {timeZone:'America/Caracas', hour:'2-digit', hour12:false})),
        estado: estado,
        buffer: buffer,
        saludo_enviado: estado.saludo_enviado,
        catalog_sent: estado.catalog_sent
    };

    // --- LA MAGIA OCURRE AQUÍ ---
    let respuestaIA = await cerebro.procesarIntencion(historialDB, contexto);

    // 5. PROCESAR RESPUESTA (TOOL USE)
    if (respuestaIA.includes("[CALCULAR_BS:")) {
        respuestaIA = procesarCalculoMatematico(respuestaIA);
    }

    // Flags
    if (respuestaIA.includes("[CATALOG_SENT]")) estado.catalog_sent = true;
    if (respuestaIA.includes("[SET_PM]")) { estado.metodo = 'pm'; estado.paso = 'REQUISITOS'; }
    if (respuestaIA.includes("[SET_TRANSF]")) { estado.metodo = 'transf'; estado.paso = 'REQUISITOS'; }
    if (respuestaIA.includes("[SET_USDT]")) { estado.metodo = 'usdt'; estado.paso = 'REQUISITOS'; }

    // Cierre Efectivo
    if (respuestaIA.includes("[CLOSE_CASH]")) {
        const msgFinal = respuestaIA.replace("[CLOSE_CASH]", "");
        await client.sendMessage(telefono, msgFinal);
        addHistory.run(telefono, 'assistant', msgFinal, Date.now());
        clientState.delete(telefono);
        return;
    }

    // Policía de Requisitos
    if (respuestaIA.includes("[TRIGGER_CHECK_COMPLETE]")) {
        const tCedula = estado.datos.has("cedula");
        const tDirec = estado.datos.has("direccion");
        const tVideo = estado.datos.has("video");
        let ok = false;

        if (estado.metodo === 'usdt') ok = (tCedula && tDirec);
        else ok = (tCedula && tDirec && tVideo);

        if (ok) {
            estado.paso = 'CONFIRMACION';
            // Recursividad para obtener ultimátum
            const msgUlt = await cerebro.procesarIntencion(historialDB, {...contexto, estado: estado}); // Estado actualizado
            respuestaIA = msgUlt.replace("[TRIGGER_PAYMENT_SEND]", ""); 
        } else {
            let falta = [];
            if (!tCedula) falta.push("Foto Cédula");
            if (!tDirec) falta.push("Dirección");
            if (!tVideo && estado.metodo !== 'usdt') falta.push("VIDEO");
            respuestaIA = `Disculpe, falta validar: ${falta.join(" + ")}. Por favor envíelo.`;
        }
    }

    // Envío de Pago
    if (respuestaIA.includes("[TRIGGER_PAYMENT_SEND]")) {
        if (estado.paso !== 'CONFIRMACION') {
            await client.sendMessage(telefono, "Confirme condiciones primero. ☝️");
            return;
        }

        let clean = respuestaIA.replace("[TRIGGER_PAYMENT_SEND]", "").trim();
        if (clean) await client.sendMessage(telefono, clean);
        addHistory.run(telefono, 'assistant', clean, Date.now());

        if (estado.metodo === 'usdt') {
            await client.sendMessage(telefono, "Enviando datos USDT...");
            await enviarImagenLocal(telefono, "usdtqr.jpg");
        } else {
            await client.sendMessage(telefono, "Enviando datos Bs...");
            await sleep(2000, 3000);
            const img = estado.metodo === 'pm' ? "pago_movil.jpg" : "transferencia.jpg";
            await enviarImagenLocal(telefono, img);
        }
        estado.paso = 'PAGO';
        setTimeout(async () => {
            if (clientState.has(telefono)) await client.sendMessage(telefono, "¿Todo bien con el pago? ⏳");
        }, 10 * 60 * 1000);
        return;
    }

    // 6. ENVIAR Y GUARDAR EN MEMORIA
    let final = respuestaIA.replace(/\[.*?\]/g, "").trim();
    if (final) {
        await client.sendMessage(telefono, final);
        addHistory.run(telefono, 'assistant', final, Date.now()); // Guardamos lo que dijo el bot
        estado.saludo_enviado = true;
    }

    // 7. CIERRE DE VENTA (APRENDIZAJE)
    if (estado.paso === 'PAGO' && (buffer.mediaData || txtLower.includes("listo"))) {
        let tipo = estado.metodo === 'usdt' ? "USDT" : "Bolívares";
        
        // --- AQUÍ OCURRE EL APRENDIZAJE ---
        // Guardamos la conversación exitosa en un log
        registrarAprendizaje(telefono, 'ventas_exitosas', { metodo: tipo, historial: historialDB });
        
        if (buffer.mediaData) await notificarPagoTelegram(tipo, Buffer.from(buffer.mediaData, 'base64'), "Credito");
        else await notificarPagoTelegram(tipo, null, "Credito (Texto)");
        
        await client.sendMessage(telefono, "Recibido, verificando...");
        clientState.delete(telefono);
    }
}

// ==============================================================================
// 4. INICIO Y EVENTOS
// ==============================================================================
client.on('qr', (qr) => qrcode.generate(qr, { small: true }));

client.on('ready', () => {
    console.log('🔗 UltronIA V26 (Cerebro + Memoria DB) Conectada.');
    console.log('🛡️ Esperando 5 min de seguridad...');
    setTimeout(() => {
        botReadyTime = Math.floor(Date.now() / 1000); 
        isReady = true; 
        console.log(`✅ ULTRONIA ONLINE.`);
    }, 5 * 60 * 1000); 
});

client.on('message', async msg => {
    // Admin Upload
    if (msg.body.startsWith(`!${CLAVE_ADMIN}`)) {
        if (!msg.hasMedia) return msg.reply("Falta foto.");
        const c = msg.body.toLowerCase();
        let f = "";
        if (c.includes("pm")) f = "pago_movil.jpg";
        else if (c.includes("transf")) f = "transferencia.jpg";
        else if (c.includes("usdt")) f = "usdtqr.jpg";
        else return msg.reply("Error comando.");
        try {
            const m = await msg.downloadMedia();
            fs.writeFileSync(path.join(ASSETS_PATH, f), m.data, 'base64');
            return msg.reply(`✅ ${f} guardada.`);
        } catch (e) { return msg.reply("Error: " + e.message); }
    }

    if (!isReady) return;
    if (msg.timestamp < botReadyTime) return;
    if (checkBlocked.get(msg.from)) return;
    const h = parseInt(new Date().toLocaleTimeString('es-VE', {timeZone:'America/Caracas', hour:'2-digit', hour12:false}));
    if (h < 8 || h >= 22) return;
    if (checkMsgId.get(msg.id.id)) return;
    insertMsgId.run(msg.id.id, msg.timestamp);
    if (msg.fromMe || msg.isStatus) return;
    if (msg.type === 'ptt' || msg.type === 'audio') return client.sendMessage(msg.from, "No audios. ✍️");

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
