1. 🛡️ Seguridad y Blindaje del Sistema
Protocolo de Arranque Seguro (5 Minutos): Al iniciar, el bot entra en silencio absoluto por 5 minutos. Ignora cualquier mensaje viejo, spam o sincronización pendiente. Solo atiende mensajes nuevos después de ese tiempo.
Base de Datos Anti-Spam (SQLite): Registra cada mensaje procesado para evitar bucles o responder dos veces lo mismo si se reinicia el servidor.
Horario de Oficina: Activo estrictamente de 8:00 AM a 10:00 PM (Hora Venezuela). Fuera de horario, no responde.

Filtros de Entrada:
Anti-Llamadas: Rechaza llamadas automáticamente.
Anti-Notas de Voz: Responde que no puede escuchar audios.



2. 📸 Gestión de Imágenes (NUEVO MÉTODO V19)
Carga vía WhatsApp (Admin): Ya no usas Telegram para subir las fotos.
Tú (Admin) envías la foto al chat del bot en WhatsApp.
Usas el comando en el comentario de la foto: !admin123 pm, !admin123 transf o !admin123 usdt.
El bot guarda la imagen en el VPS al instante y confirma con "✅ Imagen actualizada".
Envío Local: El bot envía estas imágenes desde su disco duro al cliente cuando llega el momento del pago.



3. 🧠 Inteligencia Comercial y Nicho
Inventario Completo: Sabe que vende Electrodomésticos, Hogar, Starlink, Juguetes y Perfumes.
Filtro de Nicho: Rechaza amablemente preguntas sobre cauchos, repuestos de auto o soporte técnico.
Lectura de Catálogo WA: Si el cliente envía una orden del carrito de WhatsApp, el bot lee el Título del Producto para entender qué es y (si pusiste el precio en el título) cuánto cuesta.
Visión Artificial: Si envían foto de un producto físico, lee el precio en la etiqueta ($).
Anti-Insultos: Si detecta groserías, corta la venta y despide al usuario.



4. 💰 Reglas Financieras (Estricto)
Segregación de Moneda:
Tienda Física: Aclara que allá SOLO aceptan Dólares Efectivo.
WhatsApp (Envíos): Aclara que SOLO aceptan Bs (Pago Móvil/Transf) o USDT.
Tasa BCV Automática: Se actualiza sola cada 1 hora.

Calculadora:
Bolívares = Precio ($) x Tasa BCV.
USDT = Precio ($) x 0.5 (50% Descuento).



5. 🚦 Flujo de Ventas "Hardcoded" (CONTROL TOTAL)
Aquí es donde la V19 cambia drásticamente. La IA ya no decide cuándo avanzar, el código la obliga mediante ESTADOS:
FASE 1: Inicio y Detección
Si no hay foto: Envía Catálogo.
Si hay foto/orden: Confirma disponibilidad.
Detecta intención de compra y pregunta método de pago.
FASE 2: Verificación de Requisitos (Estado Bloqueante)
El bot NO avanza hasta tener los requisitos completos según el método:
USDT: Cédula + Dirección.
Bolívares (PM/Transf): Cédula + Dirección + VIDEO.
Detector de Video: El código verifica técnicamente si el archivo adjunto es un video real. Si falta, lo pide y no suelta la cuenta.
FASE 3: Ultimátum (Estado de Confirmación)
Una vez validados los requisitos, el bot envía el texto legal: "Dispondrá de 10 minutos... por favor CONFIRME".
Bloqueo: El bot no envía los datos bancarios hasta que el cliente responda "Sí", "Confirmo", "Ok".
FASE 4: Pago y Cierre
Solo tras la confirmación, envía el Texto de Pago + la Imagen (que subiste por WhatsApp).
Activa un temporizador de 10 minutos.
A los 10 minutos pregunta: "¿Todo bien con el pago?".



6. 🔔 Notificaciones (Vía Telegram)
Recepción de Comprobantes:
Cuando el cliente envía el capture, el bot lo reenvía a tu Grupo de Telegram.
Pie de foto: "Credito".
Alerta Admin: Te envía un mensaje privado a ti en Telegram: "🔔 Pago Movil Recibido".



7. 🎭 Humanización
Buffer Inteligente: Espera 7 segundos desde el último mensaje del cliente para leer todo el bloque y responder una sola vez.
Typing: Simula escribir durante 3 segundos antes de enviar.



8. 🧠 Memoria y Contexto (Solución a la Amnesia)
Memoria de Elefante (Historial Persistente):
Función: El bot ahora lee los últimos 20 mensajes de la conversación antes de responder.
Corrección: Si el cliente envía una foto de un producto ($50) y 3 mensajes después pregunta "¿Cuánto es en Bs?", el bot recuerda el precio de $50 y hace el cálculo sin volver a preguntar "¿Cuál es el precio?".
Persistencia en Base de Datos (SQLite):
Función: El historial de chat se guarda en un archivo .db.
Corrección: Si reinicias el servidor o se va la luz, el bot no olvida lo que estaba hablando con el cliente.
Detector de Imágenes Reenviadas:
Función: Inyecta un aviso al sistema [SISTEMA: FOTO DETECTADA] incluso si la descarga de la imagen falla.
Corrección: Evita que el bot diga "envíame una foto" cuando el cliente ya le reenvió una.


9. 💡 Discernimiento e Inteligencia (Solución a la Lógica Inversa)
Sistema de "Intención" (Discernimiento):
Función: El cerebro analiza la semántica antes de actuar. Distingue entre:
Pregunta de Confirmación: "¿El precio es en dólares?" -> Respuesta: "Sí".
Pregunta de Conversión: "¿Cuánto son esos dólares en Bs?" -> Acción: Calcular.
Corrección: Evita que el bot intente calcular cuando solo le preguntan la moneda, y evita que pida el monto si ya lo tiene en memoria.
Uso de Herramientas (Tool Use):
Función: La IA no calcula matemáticamente (porque se equivoca). Emite un token [CALCULAR_BS: monto].
Corrección: El código index.js intercepta el token, multiplica por la Tasa BCV exacta y entrega el monto preciso en Bolívares y USDT (50% off).



10. 🎓 Aprendizaje y Evolución (Nuevo)
Registro de Ventas Exitosas:
Función: Cada vez que una venta llega al paso de "Pago", se guarda la conversación entera en aprendizajes/ventas_exitosas.json.
Objetivo: Permitirte leer cómo fluyen las ventas reales para ajustar el prompt en el futuro.
Log de Errores/Dudas:
Función: El sistema está preparado para registrar flujos que no terminaron en venta (aunque requiere análisis manual posterior del JSON).



11. 🛡️ Lógica de Negocio Blindada (Reglas Estrictas)
Policía de Requisitos (Hardcoded):
Función: Bloqueo por código, no por IA.
Regla:
Bolívares: Exige Cédula + Dirección + VIDEO. (Si falta video, no avanza).
USDT: Exige Cédula + Dirección. (Ignora el video).
Manejo de Dirección "Temprana":
Función: Si el cliente da la dirección al saludar ("Hola soy de Valencia"), el bot solo confirma cobertura de envío gratis.
Corrección: No marca la dirección como "requisito de venta cumplido" hasta que se acuerda el pago.
Anti-Spam de Catálogo:
Función: Memoria de estado catalog_sent.
Corrección: Si ya envió el catálogo una vez, se prohíbe volver a enviarlo. Si el cliente insiste, le dice "revisa arriba".



12. 💰 Finanzas y Pagos
Tasa BCV Automática: Se actualiza sola cada hora desde la API oficial.
Cierre por Efectivo:
Función: Si detecta intención de pagar en efectivo, manda a tienda física y cierra la sesión (clientState.delete) para evitar bucles.
Gestión de Imágenes por WhatsApp:
Función: Subes las fotos de los bancos con !admin123 pm, !admin123 transf, !admin123 usdt directo al chat del bot.



13. 🔒 Seguridad y Protocolo
Anti-Insultos Pro:
Función: Detecta groserías, envía mensaje de despedida ("sus datos pasarán a una base de datos") y Bloquea al usuario en la base de datos para que el bot no le vuelva a responder nunca.
Arranque Seguro (5 Minutos):
Función: Al encender, ignora mensajes viejos para no responder cosas de hace horas.
Horario de Oficina:
Función: Solo responde de 8:00 AM a 10:00 PM.
