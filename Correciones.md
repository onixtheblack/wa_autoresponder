V12: Inicio (Visión y Tasa)

-Visión de Precios en Fotos: Me indicaste que "la IA sí ve el precio en las fotos" y que yo debía programar que, si el cliente envía una imagen con precio (ej. $250), el bot lo lea.
-Cálculo en Bolívares: Que el bot descargue la Tasa del Dólar automáticamente y, al ver el precio en la foto, le diga al cliente cuánto es en Bolívares.

V13: Lógica de Ventas y Telegram

-Descuento USDT: "Los pagos en USDT tienen 50% de descuento". El bot debe calcularlo y decirlo si el cliente elige ese método.
-Filtro de Nicho: "Hay clientes que preguntan cosas locas como cauchos o soporte técnico". El bot debe decir que no vendemos eso y mandarlos a tienda.
-Flujo USDT (Rápido): Si pagan en USDT, "pedir los mismos requisitos menos el Video".
-Plantilla USDT: Al pagar en cripto, enviar un texto específico con la dirección de billetera y una Imagen del QR.
-Flujo Bolívares (Estricto): Pedir obligatoriamente: Cédula, GPS y Video.
-Ultimátum de 10 Minutos: Al recibir requisitos, enviar: "Dispondrá de 10 minutos para completar el trámite... por favor CONFIRME".
-Entrega de Datos de Pago: "Información recibida, en breve se le enviará la información...". Esperar 3 segundos y enviar la Imagen del Pago Móvil o Transferencia (según corresponda).
-Notificaciones a Telegram:
-Al Grupo: Enviar la foto del comprobante con el texto "Credito".
-Al Bot Privado: Notificar "Pago Movil Recibido" o "Transferencia Recibida".
-Gestión Dinámica de Imágenes: Que tú puedas subir las fotos de los bancos a un chat de Telegram y el bot las actualice en el VPS para no usar comandos.

V14 - V15 - V16: El Problema de la Sincronización

-Error de Mensajes Viejos: "El bot se sincronizó e intentó responder a mensajes viejos".
-Corrección de Tiempo: Pediste que el bot solo responda mensajes que lleguen a partir del momento del encendido.
-Aumento de Seguridad: "Me parece poco tiempo... mejor que inicie 5 minutos después" para evitar cualquier error de sincronización.
-Buffer de Escucha: "Subirlo a 7 segundos", porque hay clientes que escriben lento.

V17: Corrección de Errores de Prueba

-Catálogo vs. Foto: "Si el cliente no envía imagen, se ofrece catálogo". (El bot estaba pidiendo foto a juro).
-Agresividad: "El error es empujar agresivamente la compra". El bot debe confirmar disponibilidad y garantía, no pedir pago de una vez.
-Corrección de Envíos: El bot decía "recogida en tienda". Tú corregiste: "Los envíos son totalmente Gratis a nivel nacional (Zoom/MRW)".
-Confianza en Requisitos: Agregar texto indicando que los requisitos son para "registro en sistema de facturación y transporte".
-Error del Video: "Necesitamos que el bot reconozca que se envió el video a la primera". (El bot decía que faltaba el video aunque ya lo hubieras enviado).
-Falla de Imágenes: El bot no estaba enviando las imágenes del banco al chat.

V18pro: Lógica de Negocio Avanzada

-Categorías Nuevas: Agregar al inventario: Antenas Starlink, Juguetes y Perfumes.
-No Repetir Catálogo: Si el bot ya envió el catálogo, que no lo vuelva a enviar, que le diga al cliente que lo busque arriba.
-Lectura de Catálogo WhatsApp: "No ve precio del catálogo interno". Corregir para que lea el título del producto donde tú pones el precio.
-Ubicaciones: Si preguntan "dónde están", responder "sucursal más cercana" y aclarar que las promos son para envío.
-Regla del Efectivo: "En tienda solo se aceptan dólares en efectivo". Si es compra online, solo Bs y USDT.
-Anti-Insultos: "Si un cliente ofende... el bot debe decir: sus datos pasarán a una base de datos feliz día".
-No repetir requisitos: Si el cliente no los envía, preguntar si va a comprar, pero no repetir la lista a cada rato.
-Más Emojis: Que el bot sea más visual.
-Problema de Imágenes Telegram: Las imágenes seguían fallando al subirse desde Telegram al VPS.

V19: Control de Flujo y Cambio de Carga

-Olvido de Requisitos: "Al bot se le olvida verificar que deben estar los 3 requisitos". (Estaba soltando el pago antes de tiempo).
-Salto del Ultimátum: "El bot no está pidiendo la confirmación de límite de tiempo".
-Cambio de Método de Carga: "El bot sigue sin enviar el método de pago desde Telegram... ingeniate algo real". -> Solución: Carga mediante comando !admin directamente por WhatsApp.

V20: Corrección de Diálogo (Humanización)

-Saludo: "Que solo diga buen día o buenas noches, sin nombre de Multimax".
-Diálogo Distorsionado: El bot estaba diciendo "puedo ayudarte a detectar tu intención" (instrucciones internas). Pediste eliminar eso.
-Error con Efectivo: "El cliente dijo efectivo y el bot le ofreció Starlink". Corregir para que lo mande a tienda y corte la venta.
-Presentación Repetitiva: Si el cliente manda catálogo, no volver a presentarse.

V21: Corrección de Interpretación de Dirección (Actual)

-Interpretación de Dirección: "Tienes un error en la interpretación". Si el cliente manda la dirección al principio, es para saber si hay envío ("para tantear"), no para cerrar la compra.
-Ajuste: El bot debe confirmar la cobertura (Zoom/MRW) y preguntar si desea ver productos, en lugar de pedir la cédula de inmediato.


V26

Esta versión separa el "Cuerpo" (Ejecución, seguridad, archivos) de la "Mente" (Pensamiento, contexto, ventas). Esto nos permite tener un prompt mucho más extenso y complejo en el cerebro sin saturar el código de conexión.
Estructura de Archivos
Tendrás 2 archivos principales en la carpeta src:
src/cerebro.js (La Inteligencia, Contexto y Reglas de Negocio).
src/index.js (El Servidor, Conexión WhatsApp y Ejecución de Comandos).
1. index.js (El Cuerpo y los Músculos) 💪
Este archivo será el "ejecutor físico". No piensa, solo actúa.
Se encarga de: Conectarse a WhatsApp, recibir mensajes, detectar si hay fotos, escribir en la base de datos (SQLite), subir archivos, enviar las imágenes de pago, controlar el horario y bloquear insultos.
Su función: Es el "policía" que hace cumplir las reglas estrictas (si no hay video, no paso el pago).
2. cerebro.js (La Mente y el Subconsciente) 🧠
Este archivo será puro pensamiento y lenguaje.
Se encarga de: La personalidad de Greiluz, la memoria de corto plazo, el contexto de la conversación, entender si el cliente está "tanteando" o comprando, y discernir si "50" son dólares o bolívares.
Su función: Aquí meteremos el Prompt Masivo (las instrucciones de comportamiento) y la lógica de "Memoria Conversacional".
¿Por qué esto soluciona tus problemas?
Contexto Infinito (o casi): Al tener un archivo cerebro.js dedicado, podemos crear una función que gestione el historial de chat de forma mucho más limpia. Podemos hacer que recuerde lo que se dijo hace 10 mensajes sin ensuciar el código de conexión.
Claridad Mental: Si Greiluz empieza a hablar raro, solo revisamos cerebro.js. Si Greiluz no envía la foto del banco, solo revisamos index.js.
Discernimiento: En cerebro.js podemos crear funciones específicas de lingüística. Por ejemplo, una función analizarIntencion(texto) que decida antes de responder si el cliente quiere convertir divisa o solo preguntar.
¿Cómo funcionaría la comunicación entre ellos?
Es como un piloto y su copiloto:
Cliente: "Hola, ¿precio?"
index.js (Cuerpo): Recibe el mensaje. Verifica que no sea spam. Le pasa el texto a cerebro.js.
cerebro.js (Mente): Analiza el texto + el historial anterior. Decide qué responder usando la IA. Le devuelve a index.js la respuesta y las "órdenes" (ej: [ENVIAR_CATALOGO]).
index.js (Cuerpo): Recibe la orden, busca el archivo y lo envía.
Si te gusta esta idea, puedo reestructurar todo el proyecto ahora mismo para separar el código en estos dos archivos. Esto hará que el código sea mucho más largo en total, pero infinitamente más ordenado, potente y fácil de corregir.


