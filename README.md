# Luna Fashion 🌙

## Tecnologías y Entorno

Este proyecto está desarrollado con el siguiente stack de herramientas de última generación:

*   **Core:** [React 19](https://react.dev/) con Hooks (`useState`, `useEffect`).
*   **Lenguaje:** [TypeScript](https://www.typescriptlang.org/) para tipado estático y código robusto.
*   **Build Tool & Servidor:** [Vite 8](https://vitejs.dev/) (Hot reload ultrarrápido).
*   **Gestor de Paquetes:** [pnpm](https://pnpm.io/) (Definido en `.mise.toml`).

## Arquitectura de Diseño (UI/UX)

Toda la interfaz es construida desde cero (sin Material UI, Radix, shadcn, etc.) utilizando:

*   **Tailwind CSS v4:** Implementado directamente vía plugin de Vite, eliminando la necesidad del tradicional archivo `tailwind.config`.
*   **CSS Personalizado (`src/index.css`):**
    *   Uso intensivo de directivas modernas como `@theme`.
    *   Animaciones a medida con `@keyframes`.
    *   Clases utilitarias propias: `.gold-shimmer`, `.glass-blue`, `.btn-gold`.
*   **Tipografía:** Fuentes importadas desde Google Fonts vía CSS `@import`:
    *   *Playfair Display:* Serif elegante reservada para títulos.
    *   *Outfit:* Sans-serif moderna y legible para el cuerpo del texto.
*   **Recursos Visuales:**
    *   Imágenes de productos y *hero* consumidas directamente desde Unsplash por URL.
    *   Gráficos vectoriales (SVG) en línea: Elementos como la luna (`MoonSVG`) y los íconos del navbar están dibujados directamente en JSX, estilizados con gradientes radiales y filtros CSS avanzados.

## 💻 Configuración Local para Colaboradores

Sigue estos pasos para levantar el entorno de desarrollo en tu máquina local.

### 1. Prerrequisitos
Asegúrate de tener instalados:
*   [Node.js](https://nodejs.org/) (v20 o superior).
*   [pnpm](https://pnpm.io/installation) (`npm install -g pnpm`).

### 2. Instalación
Clona este repositorio y descarga las dependencias:

```bash
# Clonar el repositorio
git clone https://github.com/BismarckFSantana/BD-PROYECTO

# Entrar al directorio
cd BD-PROYECTO

# Instalar las dependencias
pnpm install
```

## Conectar productos con SQL Server

La tienda obtiene sus productos desde `GET /api/products`. El navegador solo llama al API; las credenciales de SQL Server permanecen en el servidor.

1. Crea la base de datos y las tablas usando las sentencias `CREATE DATABASE` y `CREATE TABLE` del inicio de `PROYECTOBD.sql`. El resto del archivo contiene ejemplos de consultas y no debe ejecutarse como una migración completa.
2. Copia `.env.example` a `.env` y configura `DB_SERVER`, `DB_PORT`, `DB_DATABASE`, `DB_USER` y `DB_PASSWORD` con los datos de tu SQL Server. No compartas ni subas `.env`.
3. Asegúrate de que `producto` y `variante_producto` tengan registros, y de que los productos tengan al menos una variante con `stock > 0`. El cliente elige talla y el carrito usa el precio y disponibilidad de esa variante.
4. En una terminal ejecuta `pnpm api:dev` para iniciar el API. En otra, ejecuta `pnpm dev` para iniciar la interfaz. Vite reenvía `/api` al servidor local en el puerto 3001.

El filtro de colección usa el campo `estilo` de `producto`; los valores disponibles aparecerán automáticamente como filtros. Para producción, despliega el API en un servidor accesible por la aplicación y define `VITE_API_URL` como la URL base del API; configura también `CORS_ORIGIN` en el API con el origen de la aplicación.

### Carrito, cuentas y pago contra entrega

1. Después de crear las tablas iniciales, ejecuta [db/migrations/002_cash_checkout.sql](./db/migrations/002_cash_checkout.sql) en SQL Server. La migración agrega el hash de contraseña, el estado del pedido, la dirección guardada y permite que el stock llegue a cero.
2. En `.env`, configura `SESSION_SECRET` con una clave aleatoria privada de al menos 32 caracteres. No uses la misma clave que `PRODUCT_IMAGE_UPLOAD_TOKEN`.
3. Inicia el API y la interfaz. Agrega un producto seleccionando una talla; luego crea una cuenta o inicia sesión desde el carrito. Los productos, tallas y cantidades del carrito se guardan en la base de datos.
4. Confirma la dirección y el teléfono de entrega para crear un pedido con estado `PENDIENTE_EFECTIVO`. El servidor valida y descuenta el inventario dentro de una transacción, guarda las líneas en `factura` y muestra una referencia del pedido.
5. Desde la confirmación, abre **Ver / imprimir comprobante**. La página `/factura/<referencia>` muestra los datos del pedido y permite imprimirlo o guardarlo como PDF desde el navegador. Debes mantener la sesión iniciada y usar la cuenta que realizó la compra para consultar el comprobante.

El documento es un comprobante del pedido pendiente de pago contra entrega; no es una factura electrónica ni un documento tributario. El pago se realiza en efectivo al recibir; la aplicación no procesa pagos en línea ni registra automáticamente que el repartidor recibió el efectivo. El subtotal mostrado no incluye envío: el costo se confirma por separado antes del despacho. Las contraseñas se guardan con scrypt y la sesión usa una cookie HttpOnly. Despliega la aplicación y API bajo HTTPS en el mismo sitio. Esta primera versión no incluye recuperación de contraseña ni verificación de correo. Las cuentas antiguas que no tengan `password_hash` deberán volver a registrarse con otro correo o recibir una contraseña mediante un proceso administrativo antes de poder iniciar sesión.

### Cargar imágenes de productos

1. Define `PRODUCT_IMAGE_UPLOAD_TOKEN` en `.env` con una clave aleatoria larga y privada.
2. Inicia el API y abre `/admin` en el navegador.
3. Ingresa la clave, elige una imagen JPG, PNG o WebP de hasta 5 MB y selecciona **Guardar imagen**. El servidor guarda el archivo en `uploads/` y actualiza `producto.ruta_imagen`; el catálogo carga la imagen desde esa ruta.

Las imágenes se guardan en el disco del servidor. En producción, usa un disco persistente y sirve la aplicación y el API por HTTPS. La clave no se guarda en el navegador y se debe volver a ingresar al abrir el administrador.
