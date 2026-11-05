# Ventas de prepagas

Aplicación web para registrar ventas con Google Drive o un Excel local.

Para publicar, elegir en GitHub Settings → Pages → Deploy from a branch, rama `main` y carpeta `/ (root)`.

Para el acceso directo con Google, agregar `https://matiascastro00.github.io` en los orígenes autorizados de JavaScript del cliente OAuth. El ID de cliente en `app.js` es público; no agregues secretos de cliente al repositorio.

La sesión y la última planilla guardadas por el navegador son específicas del dominio y habrá que conectar la cuenta nuevamente al usar la nueva dirección.
