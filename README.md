1. Seguridad y Anti-Bloqueo (Blindaje)
🛡️ Barrera de Arranque (Nueva V15): Al encenderse, el bot espera 15 segundos y marca la hora exacta. Ignora automáticamente cualquier mensaje anterior a ese segundo (spam viejo, sincronización o mensajes acumulados mientras estaba apagado).

💾 Memoria Permanente (Base de Datos): Usa una base de datos local (SQLite) para recordar a quién ya le respondió. Si reinicias el bot, no volverá a responder mensajes duplicados.

🚫 Anti-Llamadas y Anti-Audios: Rechaza llamadas automáticamente y avisa educadamente que no escucha notas de voz.

⏰ Horario Estricto: Solo trabaja de 7:00 AM a 10:00 PM (Hora Venezuela). Fuera de ese horario, ignora todo.

2. Inteligencia Comercial y Visión
👁️ Visión de Precios (Ojos): Si el cliente envía una foto con un precio visible (ej: "$100"), la IA lo lee.

🧠 Filtro de Nicho: Sabe que vende electrodomésticos. Si piden "cauchos", "repuestos" o "soporte técnico", los rechaza amablemente y los manda a la tienda física.

🗣️ Saludos Dinámicos: Dice "Buenos días", "Buenas tardes" o "Buenas noches" según la hora real.

3. Sistema Financiero Automatizado
💵 Tasa BCV en Vivo: Se conecta a internet cada hora para actualizar el precio del dólar oficial en Venezuela.

🧮 Calculadora Inteligente:

Si piden precio en Bolívares: Multiplica el precio de la foto por la Tasa BCV.

Si piden precio en USDT/Binance: Calcula automáticamente el 50% de descuento sobre el precio en dólares.

4. Flujo de Ventas y Pagos (El "Cierre")
🚦 Paso a Paso Estricto: No pide requisitos (cédula/video) hasta que el cliente define cómo va a pagar.

🪙 Ruta Cripto (USDT/Binance):

No pide video (agiliza la venta).

Envía la plantilla de texto con la dirección de la Wallet + Imagen del QR automáticamente.

🏦 Ruta Bolívares (Pago Móvil/Transferencia):

Exige los 3 requisitos: Cédula + GPS + Video de confirmación.

Ultimátum: Una vez recibidos los requisitos, da un aviso de "10 minutos para pagar" antes de enviar los datos bancarios.

Imagen Dinámica: Envía la foto del Pago Móvil o Transferencia (según lo que elija el cliente) desde la memoria del servidor.

⏳ Seguimiento: Si pasan 10 minutos después de dar los datos y el cliente no paga, pregunta: "¿Todo bien con el pago?".

5. Integración con Telegram (Gestión Remota)
📸 Gestor de Imágenes: Tú (Administrador) puedes subir las fotos del Pago Móvil, Transferencia o QR al chat de Telegram y el bot las actualiza en el servidor al instante (sin tocar código).

🔔 Notificaciones de Cobro:

Al Grupo: Envía la FOTO del comprobante con el texto "Credito" al pie.

A tu Privado: Te avisa con texto: "🔔 Pago Movil Recibido" o "🔔 USDT Recibido".

6. Humanización
🎭 Comportamiento Humano: "Escribe" (typing...) durante unos segundos antes de responder.

👂 Buffer de Escucha: Espera 4 segundos para agrupar mensajes seguidos del cliente y responder una sola vez con todo el contexto.
