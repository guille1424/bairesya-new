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

## Catálogo de muestra

`npm run db:demo` carga 25 modelos de ejemplo de las tres colecciones (77 combinaciones de talle y color) con ilustraciones en `public/demo`, para mostrar la tienda. Usan códigos `DEMO-…`. Antes de lanzar con productos reales se quitan con:

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
