# BairesYa

Tienda online + panel de gestión (stock, caja, pedidos, clientes y reportes) para BairesYa.

**Stack:** Next.js 16 (App Router, Cache Components) · React 19 · Prisma 7 + PostgreSQL · Vercel Blob · Tailwind 4 + shadcn/ui.

## Qué incluye

| Área | Ruta | Quién |
|---|---|---|
| Tienda: catálogo, ficha de producto, carrito, pedido por WhatsApp | `/` | Público |
| Cuenta del cliente: registro, ingreso, historial de pedidos | `/ingresar`, `/registro`, `/mi-cuenta` | Clientes |
| Dashboard con ventas, márgenes y reportes Excel | `/admin` | Admin |
| Caja (escáner por cámara o lector, precio efectivo / transferencia / personalizado) | `/admin/nuevo-pedido` | Equipo |
| Pedidos, entrega, cancelación, aviso por WhatsApp, lista de compras | `/admin/pedidos` | Equipo |
| Aprobación de pedidos de la tienda | `/admin/pedidos-web` | Equipo |
| Inventario con fotos, etiquetas 80×80 mm e importación Excel | `/admin/inventario`, `/admin/importar` | Equipo |
| Usuarios y roles | `/admin/usuarios` | Admin |

Los empleados no ven costos, proveedores, el dashboard ni los reportes.

## Desarrollo local

Requisitos: Node 20.19+ y Docker.

```bash
# 1. Base de datos
docker run -d --name bairesya-pg -e POSTGRES_USER=bairesya -e POSTGRES_PASSWORD=bairesya \
  -e POSTGRES_DB=bairesya -p 5434:5432 postgres:17

# 2. Variables de entorno
cp .env.example .env   # completar SESSION_SECRET y ADMIN_INITIAL_PASSWORD

# 3. Dependencias, migraciones y usuario admin
npm install
npm run db:migrate
npm run db:seed

# 4. Levantar
npm run dev            # http://localhost:3000 (tienda) y /admin (panel)
```

Otros comandos: `npm test` (tests de reglas de negocio), `npm run lint`, `npm run build`, `npm run db:studio`.

Las fotos de productos necesitan `BLOB_READ_WRITE_TOKEN` (de un Blob store de Vercel). Sin él, todo lo demás funciona.

## Deploy en Vercel

1. Subir este proyecto a un repositorio de GitHub e importarlo en Vercel (framework: Next.js).
2. En **Storage** del proyecto, agregar **Prisma Postgres** (carga `DATABASE_URL`) y **Blob** (carga `BLOB_READ_WRITE_TOKEN`).
3. En **Settings → Environment Variables**, agregar:
   - `SESSION_SECRET`: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`
   - `WHATSAPP_NUMBER`: número de la tienda, ej. `5491112345678`
   - `SITE_URL` (opcional): dominio final, ej. `https://bairesya.com`. Si no está, se usa el dominio de producción de Vercel.

   Estas dos también se aceptan con prefijo `NEXT_PUBLIC_`. Se leen al compilar, así que después de cambiarlas hay que volver a deployar.
4. Deploy. El script `vercel-build` aplica las migraciones (`prisma migrate deploy`) antes de compilar.
5. Crear el admin una sola vez, apuntando a la base de producción:
   ```bash
   DATABASE_URL="<url de producción>" ADMIN_INITIAL_PASSWORD="<contraseña segura>" npm run db:seed
   ```

> Si los deploys de preview comparten la base con producción, también aplican migraciones sobre ella. Para evitarlo, conectá una base distinta para el entorno Preview.

## Fotos de productos

Cada foto se llama como el código de barras del producto (columna F de la plantilla): `01000302M.jpg` es la portada y `01000302M_2.jpg` … `_8` las siguientes (también `.png` y `.webp`, hasta 8 MB).

Desde el panel: **Inventario → Subir fotos**, elegir la carpeta, revisar la vista previa y confirmar. Para muchas fotos o desde la terminal, el mismo proceso como script:

```bash
npm run fotos -- ruta/a/la/carpeta --probar   # muestra qué haría, sin subir nada
npm run fotos -- ruta/a/la/carpeta            # sube a Vercel Blob (productos/) y las vincula
```

Necesita `BLOB_READ_WRITE_TOKEN` y `DATABASE_URL` de la base que corresponda. Una foto con el mismo nombre reemplaza a la anterior. Las fotos de códigos que todavía no existen se suben igual y se vinculan solas al importar el Excel. Los productos sin foto muestran el logo. También se pueden subir de a una desde el inventario.

## Catálogo de muestra

`npm run db:demo` carga 25 modelos de ejemplo de las tres colecciones (70 combinaciones de talle y color) con fotos reales de [Pexels](https://www.pexels.com/license/) en `public/catalogo` (uso comercial gratuito; el detalle de cada foto está en `public/catalogo/CREDITOS.md`). Las fotos de portada están en `public/brand`. Usan códigos `DEMO-…`. Antes de lanzar con productos reales se quitan con:

```bash
npm run db:demo -- --remove
```

Con `DATABASE_URL` apuntando a la base que corresponda. Después de cargar o quitar, el catálogo tarda alrededor de un minuto en actualizarse (o se actualiza al instante con un nuevo deploy).

## Reglas de negocio

- **Caja:** si se vende más de lo que hay en stock, la diferencia queda como *pre-pedido* y aparece en la **lista de compras** agrupada por proveedor. El stock se descuenta en una transacción.
- **Pedido web:** el servidor calcula los precios. El pedido queda *por aprobar* y reserva stock durante 72 h. Al aprobarlo se descuenta el stock; lo que ya no alcance pasa a pre-pedido.
- **Cancelar** devuelve al stock lo que se había descontado. El pedido queda registrado como cancelado, no se borra.
- **Ganancias y reportes:** usan el costo guardado en cada venta (`costAtSale`), así que cambiar un costo no altera el histórico.
- **Importación Excel:** misma plantilla que la versión anterior (`/Plantilla_Importacion.xlsx`). Si el código existe, actualiza el producto y reemplaza el stock. Antes de aplicar se muestra una vista previa.
