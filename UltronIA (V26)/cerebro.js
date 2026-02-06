const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ============================================================================
// BASE DE CONOCIMIENTO (MEMORIA DE LARGO PLAZO)
// ============================================================================
const KNOWLEDGE_BASE = `
📍 UBICACIONES (Solo si preguntan dónde estamos):
- Barquisimeto: Av. Lara, entre calles 8 y 11, edif El Castillo.
- Maracaibo: Av. La Limpia, al lado de Traki.
- Ciudad Bolívar: Calle los Apamates, Sector Medina Angarita.
- Valencia: Autopista del Este, vía servicio Manongo, Supermercado Forum.
- Falcón: Carretera Nacional Coro, Punto Fijo, distribuidor El Sabino.
- San Cristóbal: CC Sambil, nivel autopista, local L15.
NOTA: "Si preguntan por otra ciudad, di que tenemos envíos gratis nacionales".

🛡️ POLÍTICAS Y GARANTÍAS:
- Garantía: Artículos <$50 (8 meses). Artículos >$50 (1 año).
- Créditos (Credimax): 1ra compra >$250 contado. 2da compra: Inicial 60% + 4 cuotas.
- Horario: Lunes a Domingo 8AM - 10PM.
- Envíos: GRATIS por Zoom y MRW (Solo compras online).
- Efectivo: SOLO EN TIENDA FÍSICA. (Si piden pagar efectivo, manda a tienda).
- Online: Solo aceptamos Bolívares (Tasa BCV) o USDT.

💰 REGLAS DE MONEDA Y CÁLCULO:
- TASA BCV: Variable dinámica.
- USDT: Tienen 50% de descuento sobre el precio en dólares.
- CÁLCULOS: Tú NO calculas matemáticamente. Si el usuario pide conversión, usas la HERRAMIENTA [CALCULAR_BS: monto].
`;

// ============================================================================
// LÓGICA DE PROCESAMIENTO
// ============================================================================
async function procesarIntencion(historialChat, inputUsuario, contexto) {
    // contexto trae: { tasa, hora, estado, esOrden, tieneVideo, tieneFoto, catalog_sent }
    
    // 1. DEFINIR SALUDO (Solo si no se ha saludado)
    let saludo = "";
    if (!contexto.saludo_enviado) {
        const h = contexto.hora;
        saludo = h < 12 ? "Buenos días ☀️" : (h < 18 ? "Buenas tardes 🌤️" : "Buenas noches 🌙");
    }

    // 2. LÓGICA DE CATÁLOGO (Anti-Repetición)
    let instruccionCatalogo = "";
    if (contexto.catalog_sent) {
        instruccionCatalogo = `EL CATÁLOGO YA SE ENVIÓ. Si piden ver productos, DILE: "Por favor revise el catálogo que le envié más arriba 👆". NO envíes links.`;
    } else {
        instruccionCatalogo = `Si piden ver productos y NO hay foto en este mensaje: ESTÁS OBLIGADO a enviar los links:
        (Telegram: https://t.me/Tiendaonline_oficial_bot | WhatsApp: https://wa.me/c/447848106109)
        Y responde: "Aquí tiene nuestro catálogo". -> Y AGREGA EL TAG [CATALOG_SENT].`;
    }

    // 3. INSTRUCCIONES DE FLUJO (SEGÚN ESTADO ACTUAL)
    let instruccionesFase = "";

    if (contexto.estado.paso === 'INICIO') {
        instruccionesFase = `
        [FASE: VENTAS / ATENCIÓN]
        OBJETIVO: Aclarar dudas y cerrar venta.
        
        🧠 DISCERNIMIENTO DE INTENCIÓN (CRÍTICO):
        A. SI PREGUNTAN CONVERSIÓN ("¿Cuánto son $20 en Bs?", "¿Precio en bolívares?"): 
           - USA LA HERRAMIENTA: [CALCULAR_BS: numero]. Ej: [CALCULAR_BS: 20]. (El sistema hará la matemática).
        
        B. SI PREGUNTAN CONFIRMACIÓN ("¿El precio es en dólares?", "¿Son divisas?"):
           - Responde texto normal: "Sí, nuestros precios publicados son en dólares".

        C. SI ENVÍAN DIRECCIÓN (Temprana):
           - Solo confirma cobertura: "Sí cubrimos esa zona con envío gratis ✅. ¿Desea ordenar?". (NO pidas cédula aún).

        D. SI DICEN "EFECTIVO":
           - "Para pagos en efectivo 💵 le esperamos en tiendas físicas. Por aquí solo procesamos envíos (Bs/USDT)." -> TAG: [CLOSE_CASH].

        E. INTENCIÓN DE COMPRA:
           - Pregunta: "¿Cuál es su método de pago? (Bs Pago Móvil/Transf o Binance USDT)".
           - Si eligen, responde TAG: [SET_PM], [SET_TRANSF] o [SET_USDT].

        ${instruccionCatalogo}
        `;
    } 
    else if (contexto.estado.paso === 'REQUISITOS') {
        instruccionesFase = `
        [FASE: REQUISITOS - MÉTODO: ${contexto.estado.metodo.toUpperCase()}]
        DATOS YA RECIBIDOS: ${JSON.stringify(Array.from(contexto.estado.datos))}.
        
        FALTAN:
        - USDT: Cédula + Dirección.
        - PM/Transf: Cédula + Dirección + VIDEO.
        
        ACCIÓN:
        - Si envía un dato, confírmalo amablemenete.
        - Si envía TODO lo necesario: Responde ÚNICAMENTE EL TAG: [TRIGGER_CHECK_COMPLETE].
        `;
    } 
    else if (contexto.estado.paso === 'CONFIRMACION') {
        instruccionesFase = `
        [FASE: ULTIMÁTUM]
        Tu respuesta DEBE SER EXACTAMENTE:
        "Para la compra, dispondrá de 10 minutos para completar el trámite o el sistema cerrará la orden automáticamente, por favor CONFIRME las condiciones de compra y que realmente posee la disponibilidad del pago para proceder. ⏳"
        
        Si confirma (Sí/Ok): TAG: [TRIGGER_PAYMENT_SEND].
        `;
    }

    // 4. CONSTRUCCIÓN DEL PROMPT FINAL
    const systemPrompt = `
    Eres Greiluz Martinez, Asesora Multimax (Humana, profesional, no robot).
    ${saludo ? `Saludo inicial: "${saludo}".` : "NO saludes de nuevo."}
    Tasa BCV HOY: ${contexto.tasa} Bs.
    
    ${KNOWLEDGE_BASE}
    ${instruccionesFase}
    `;

    // 5. PREPARACIÓN DEL MENSAJE DE USUARIO (CONTEXTO MULTIMEDIA)
    let msgContent = inputUsuario;
    if (contexto.esOrden) msgContent = `[ORDEN CATÁLOGO WA]. ${inputUsuario}`;
    if (contexto.tieneVideo) msgContent += " [VIDEO DETECTADO] ";
    
    // Si hay foto pero no base64 (reenviada), avisamos a la IA
    if (contexto.tieneFoto && !contexto.imgBase64) {
        msgContent += " [SISTEMA: EL CLIENTE ENVIÓ UNA FOTO REFERENCIAL] ";
    }

    const messages = [{ role: "system", content: systemPrompt }];
    
    if (contexto.imgBase64) {
        messages.push({ role: "user", content: [
            {type: "text", text: msgContent}, 
            {type: "image_url", image_url: {url: `data:${contexto.mimeType};base64,${contexto.imgBase64}`}}
        ]});
    } else {
        messages.push({ role: "user", content: msgContent });
    }

    // 6. LLAMADA A OPENAI
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: messages,
            max_tokens: 500,
            temperature: 0.1
        });
        return completion.choices[0].message.content;
    } catch (e) {
        console.error("Error Cerebral:", e);
        return "Un momento, estoy verificando el sistema...";
    }
}

module.exports = { procesarIntencion };
