# Versión Google sin ID para usuarios

Esta versión se publica como **Google Apps Script Web App**. Google gestiona el inicio de sesión y el consentimiento. Cada visitante usa su propia cuenta de Google, puede elegir una hoja de cálculo a la que tenga acceso o crear una nueva en su Drive. No se pide ni se muestra ningún ID de cliente OAuth a los usuarios.

## Publicación única por quien administra la aplicación

1. Abrir [script.google.com](https://script.google.com/) con la cuenta que será propietaria de la aplicación y pulsar **Nuevo proyecto**.
2. Reemplazar el contenido de `Code.gs` por [Code.gs](Code.gs).
3. Pulsar **+ → HTML**, llamarlo `Index` y pegar [Index.html](Index.html).
4. En **Configuración del proyecto**, activar **Mostrar archivo de manifiesto `appsscript.json` en el editor**. Reemplazarlo por [appsscript.json](appsscript.json).
5. Pulsar **Implementar → Nueva implementación → Aplicación web**. Elegir **Ejecutar como: Usuario que accede a la aplicación web** y **Quién tiene acceso: Cualquier usuario con cuenta de Google**. Implementar y copiar el enlace `/exec`.
6. Probar con una cuenta distinta: Google debe pedir permisos y la aplicación debe mostrar solamente las planillas de esa cuenta. Compartir el enlace `/exec` con quienes la usarán.

El código de esta Web App se conserva aquí para referencia y publicación independiente. El sitio actual no incluye un contenedor ni un acceso a esta aplicación.

## Límite importante

Google puede mostrar una advertencia de aplicación no verificada o limitar usuarios externos cuando un Apps Script solicita acceso a Drive y Sheets. Para uso amplio con cuentas externas, el propietario quizá deba completar la verificación OAuth de Google. Esto no requiere que los usuarios busquen IDs; es una tarea de publicación de la aplicación.

La aplicación web fue publicada desde la cuenta administradora en [este enlace](https://script.google.com/macros/s/AKfycbzB4utkMYgu4sX1C8wKtmajlRndvBMSQpPSUw6HbBed4SmrSZTI8mzA5vO2YVOslFBfKA/exec). El sitio actual ya no incluye un botón hacia esta aplicación. El código fue comprobado localmente; la autorización y las operaciones reales con Google Drive todavía deben probarse en el navegador con una cuenta que acceda a la aplicación.
