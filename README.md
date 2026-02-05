1. 🛡️ Seguridad y Estabilidad (Blindaje del Servidor)
Protocolo de "Paranoia" (Arranque Seguro): Al encenderse, el bot entra en cuarentena por 5 minutos. Se conecta, pero ignora absolutamente todo mensaje anterior al momento exacto en que terminan los 5 minutos. Esto elimina el riesgo de responder spam viejo o sincronizaciones masivas.

Memoria Anti-Alzheimer (SQLite): Base de datos local que registra cada mensaje procesado. Si el VPS se reinicia, el bot recuerda a quién ya le respondió para no repetir.

Anti-Llamadas: Rechaza llamadas automáticamente.

Anti-Notas de Voz: Responde educadamente que no escucha audios.

Horario de Oficina: Trabaja estrictamente de 8:00 AM a 10:00 PM (Hora Venezuela). Fuera de eso, ignora mensajes.

2. 🧠 Inteligencia Comercial y Nicho
Inventario Ampliado (V18): El bot sabe que vende Electrodomésticos, Hogar, Antenas Starlink, Juguetes y Perfumes.

Filtro de Nicho: Si piden "cauchos", "repuestos de auto" o "soporte técnico", rechaza la venta y manda a tienda física.

Lectura de Catálogo WhatsApp: Si el cliente envía un producto del carrito de WhatsApp, el bot lee el Título del producto (donde pusiste el precio) para saber cuánto cuesta, en lugar de decir "no veo precio".

Visión Artificial (GPT-4o): Si envían foto, detecta el precio escrito en la imagen.

Defensa Anti-Insultos (V18): Si el cliente usa groserías o amenazas, el bot responde con un mensaje de despido ("sus datos pasarán a una base de datos") y bloquea la lógica de venta con ese usuario.

3. 💰 Sistema Financiero y Reglas de Moneda (Estricto)
Tasa BCV en Vivo: Consulta la API cada 1 hora.

Calculadora Automática:

Si piden Bs: Multiplica Precio($) x Tasa BCV.

Si piden USDT: Aplica 50% de Descuento sobre el precio en $.

Segregación de Pagos (V18):

Tienda Física: El bot aclara que en tienda SOLO se acepta Dólares Efectivo.

Online (Bot): Aclara que por WhatsApp SOLO se acepta Pago Móvil, Transferencia o USDT. (No acepta efectivo para envíos).

4. 🚦 Flujo de Ventas (Paso a Paso)
1. Detección:

Si envían Foto/Orden: Confirma disponibilidad y garantía. NO pide pago de una vez (menos agresivo).

Si piden precio sin foto: OBLIGA a enviar el catálogo. No da precios inventados.

Anti-Repetición de Catálogo: Si ya envió el link hace poco, no lo vuelve a enviar.

2. Intención: Solo cuando el cliente dice "Quiero comprar", pregunta el método de pago.

3. Requisitos (Loop Inteligente):

Si ya se pidieron los requisitos antes, NO vuelve a enviar la lista larga. Pregunta: "¿Desea concretar su compra?".

Texto Legal: Agrega la frase sobre "Registro en sistema de facturación y transporte".

4. Envío: Tiene precargada tu política de envíos (Gratis, Zoom, MRW, Domesa, solo compras online).

5. 💳 Pasarela de Pagos Híbrida
Ruta USDT (Rápida):

Descuento 50% aplicado.

NO pide video.

Envía Texto con Wallet + Imagen QR automáticamente.

Ruta Bolívares (Segura):

Exige: Cédula + Dirección (Estado/Municipio/Calle) + Video.

Detector de Video: El código reconoce técnicamente si el archivo es un video (.mp4, etc.) para no decir "falta video" si ya lo enviaron.

Validación de Dirección: Si la dirección es muy corta, pide detalles.

Ultimátum de Cierre: Al entregar los datos bancarios, advierte que la orden dura 10 minutos.

Seguimiento: A los 10 minutos, pregunta: "¿Todo bien con el pago?".

6. 📸 Gestión Multimedia (Telegram V2)
Subida Remota: Tú subes las fotos al chat de Telegram con los textos pm, transf o usdt.

Descarga Blindada (Fix V18): Usa un sistema de descarga por flujo (stream) para evitar que las imágenes lleguen vacías o corruptas al servidor.

Envío Local: El bot de WhatsApp toma esas imágenes del servidor y se las manda al cliente.

7. 🔔 Notificaciones y Reportes
Al Grupo de Telegram: Envía la FOTO del comprobante del cliente con el texto "Credito".

Al Admin (Privado): Notifica con texto: "🔔 Pago Movil Recibido" o "🔔 USDT Recibido".

8. 🎭 Humanización
Buffer de 7 Segundos: Espera a que el cliente termine de escribir (acumula mensajes) antes de responder.

Typing: Aparece "escribiendo..." durante 3 segundos.

Emojis: Se le ha instruido usar más emojis en la conversación para ser más amigable (salvo cuando se defiende de insultos).
