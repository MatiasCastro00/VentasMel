# PulsoGestión

Aplicación web para registrar ventas con Google Drive o un Excel local.

Identidad visual: clientes, altas y comisiones en orden. El kit completo de marca está en `branding/`.

Para publicar, elegir en GitHub Settings → Pages → Deploy from a branch, rama `main` y carpeta `/ (root)`.

Para el acceso directo con Google, agregar `https://matiascastro00.github.io` en los orígenes autorizados de JavaScript del cliente OAuth. El ID de cliente en `app.js` es público; no agregues secretos de cliente al repositorio.

La sesión y la última planilla guardadas por el navegador son específicas del dominio y habrá que conectar la cuenta nuevamente al usar la nueva dirección.

## Cotización Omint

La sección **Cotización** usa la lista Omint Empresas de noviembre de 2026 incluida en `omint-data.js`. Filtra los planes por provincia y tipo, suma los integrantes como cápitas, aplica el tramo de precio correspondiente y usa el precio de hijo 1 para el primer menor de 25 años. Los siguientes usan el precio de hijo 2 o más. Desde los 25 años se elige adulto o familiar. Los planes que empiezan en 11 cápitas avisan si faltan integrantes; los tramos que indican “Consultar con Producto” no muestran un importe.

La cotización carga inicialmente el 20 % de afiliación PyME durante un año; se puede quitar y restaurar. Se pueden agregar descuentos adicionales con motivo y porcentaje; todos se calculan sobre el valor base y su suma no puede superar el 100 %. **Generar PDF** descarga la cotización con el logo, integrantes, descuentos y total, usando el nombre del asociado y el plan como nombre del archivo. **Cargar como venta** pasa la prepaga, provincia y plan, cantidad de cápitas, valor base y descuentos en pesos al formulario de ventas. Si todavía no existe la pestaña Omint, se crea antes de abrir el formulario.

En **Modificar prepagas**, el botón **Agregar página de Omint** crea su pestaña de ventas en la planilla abierta.
