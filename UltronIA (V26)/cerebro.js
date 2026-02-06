const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ============================================================================
// BASE DE CONOCIMIENTO (Reglas inquebrantables del Negocio)
// ============================================================================
const KNOWLEDGE_BASE = `
📍 UBICACIONES:
- Barquisimeto: Av. Lara, edif El Castillo.
- Maracaibo: Av. La Limpia.
- Ciudad Bolívar: Sector Medina Angarita.
- Valencia: Autopista del Este, Forum.
- Falcón: Punto Fijo, distribuidor El Sabino.
- San Cristóbal: CC Sambil.

⚖️ POLÍTICAS:
- Garantía: <$50 (8 meses), >$50 (1 año).
- Envíos: GRATIS Zoom/MRW (Solo online).
- Efectivo: SOLO EN TIENDA. Si piden pagar efectivo, manda a tienda -> [CLOSE_CASH].
- Online: Solo Bs (Tasa BCV) o USDT.

💰 REGLAS DE CONTEXTO Y MATEMÁTICAS:
1. MEMORIA: Tienes acceso a los mensajes anteriores. SI EL USUARIO PREGUNTA "¿Cuánto es en Bs?" y ya se mencionó un precio en dólares antes, USA ESE PRECIO. No preguntes de nuevo.
2. CÁLCULO: NO calcules mentalmente. Usa el token: [CALCULAR_BS: monto].
   - Ejemplo: Si el precio es $50 y piden Bs -> Responde: "Son [CALCULAR_BS: 50]".
3. INTENCIÓN:
   - Si preguntan "¿Precio en dólares?": Confirma que sí.
   - Si preguntan "¿Cuánto son esos dólares en Bs?": Usa el token de cálculo.
`;

// ============================================================================
// PROCESADOR COGNITIVO
// ============================================================================
async function procesarIntencion(historialChat, contextoActual) {
    // contextoActual trae: { tasa, hora, estado, buffer, etc }
    
    // 1. DEFINIR SALUDO (Evitar repetición)
    let saludo = "";
    if (!contextoActual.saludo_enviado) {
        const h = contextoActual.hora;
        saludo = h < 12 ? "Buenos días ☀️" : (h < 18 ? "Buenas tardes 🌤️" : "Buenas noches 🌙");
    }

    // 2. CONTROL DE CATÁLOGO (Memoria de Estado)
    let instruccionCatalogo = "";
    if (contextoActual.catalog_sent) {
        instruccionCatalogo = `EL CATÁLOGO YA SE ENVIÓ. Si piden ver productos, NO envíes links. Di: "Por favor revise el catálogo que le envié más arriba 👆".`;
    } else {
        instruccionCatalogo = `Si piden ver productos y NO hay foto en este mensaje: ESTÁS OBLIGADO a enviar los links (Telegram/WhatsApp) y usar el TAG [CATALOG_SENT].`;
    }

    // 3. INSTRUCCIONES DE FLUJO SEGÚN FASE
    let instruccionesFase = "";

    if (contextoActual.estado.paso === 'INICIO') {
        instruccionesFase = `
        [FASE: VENTAS]
        - Si envían FOTO/ORDEN: "Excelente elección. Sí tenemos disponible ✅ con garantía."
        - Si piden conversión (Bs): REVISA EL HISTORIAL. Si ves un precio anterior, úsalo con [CALCULAR_BS: X]. Si no, pide el monto.
        - Si envían DIRECCIÓN (Temprana): "Sí cubrimos esa zona con envío gratis ✅. ¿Desea ordenar?".
        - Si dicen EFECTIVO: [CLOSE_CASH].
        - Si quieren COMPRAR: Pregunta método (Bs/USDT).
        TAGS: [SET_PM], [SET_TRANSF], [SET_USDT].
        ${instruccionCatalogo}
        `;
    } 
    else if (contextoActual.estado.paso === 'REQUISITOS') {
        instruccionesFase = `
        [FASE: REQUISITOS - MÉTODO: ${contextoActual.estado.metodo}]
        DATOS RECIBIDOS: ${JSON.stringify(Array.from(contextoActual.estado.datos))}.
        FALTAN:
        - USDT: Cédula + Dirección.
        - PM/Transf: Cédula + Dirección + VIDEO.
        ACCIÓN: Si tiene TODO, responde SOLO: [TRIGGER_CHECK_COMPLETE]. Si no, pide lo que falta.
        `;
    } 
    else if (contextoActual.estado.paso === 'CONFIRMACION') {
        instruccionesFase = `
        [FASE: ULTIMÁTUM]
        Di EXACTAMENTE: "Para la compra, dispondrá de 10 minutos para completar el trámite o el sistema cerrará la orden automáticamente, por favor CONFIRME las condiciones de compra y que realmente posee la disponibilidad del pago para proceder. ⏳"
        Si confirma: TAG: [TRIGGER_PAYMENT_SEND].
        `;
    }

    // 4. CONSTRUCCIÓN DEL SYSTEM PROMPT
    const systemPrompt = `
    Eres Greiluz Martinez, Asesora Multimax.
    ${saludo ? `Saludo: "${saludo}".` : "NO saludes."}
    Tasa BCV: ${contextoActual.tasa}.
    ${KNOWLEDGE_BASE}
    ${instruccionesFase}
    `;

    // 5. ENSAMBLAJE DE MENSAJES (MEMORIA COMPLETA)
    // Inyectamos el historial previo para que tenga contexto
    let messages = [{ role: "system", content: systemPrompt }];
    
    // Agregamos el historial reciente (limitado a últimos 8 para no gastar tanto token)
    const historialReciente = historialChat.slice(-8); 
    messages = messages.concat(historialReciente);

    // Agregamos el mensaje actual
    let currentContent = contextoActual.buffer.texto;
    if (contextoActual.buffer.esOrden) currentContent = `[ORDEN WA]. ${currentContent}`;
    if (contextoActual.buffer.tieneVideo) currentContent += " [VIDEO DETECTADO] ";
    
    if (contextoActual.buffer.mediaData) {
        messages.push({ role: "user", content: [
            {type: "text", text: currentContent}, 
            {type: "image_url", image_url: {url: `data:${contextoActual.buffer.mimeType};base64,${contextoActual.buffer.mediaData}`}}
        ]});
    } else {
        // Si es una imagen reenviada que no descargó base64, avisamos
        if (contextoActual.buffer.mimeType && contextoActual.buffer.mimeType.startsWith('image/')) {
            currentContent += " [SISTEMA: EL USUARIO ENVIÓ UNA FOTO REFERENCIAL] ";
        }
        messages.push({ role: "user", content: currentContent });
    }

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: messages,
            max_tokens: 500,
            temperature: 0.1
        });
        return completion.choices[0].message.content;
    } catch (e) {
        console.error("Error Brain:", e);
        return "Un momento...";
    }
}

module.exports = { procesarIntencion };
