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
3. Asegúrate de que `producto` y `variante_producto` tengan registros, y de que los productos tengan al menos una variante con `stock > 0`. El precio mostrado es el menor precio entre las variantes disponibles.
4. En una terminal ejecuta `pnpm api:dev` para iniciar el API. En otra, ejecuta `pnpm dev` para iniciar la interfaz. Vite reenvía `/api` al servidor local en el puerto 3001.

El filtro de colección usa el campo `estilo` de `producto`; los valores disponibles aparecerán automáticamente como filtros. El carrito sigue siendo local a la interfaz, como antes. Para producción, despliega el API en un servidor accesible por la aplicación y define `VITE_API_URL` como la URL base del API; configura también `CORS_ORIGIN` en el API con el origen de la aplicación.

### Cargar imágenes de productos

1. Define `PRODUCT_IMAGE_UPLOAD_TOKEN` en `.env` con una clave aleatoria larga y privada.
2. Inicia el API y abre `/admin` en el navegador.
3. Ingresa la clave, elige una imagen JPG, PNG o WebP de hasta 5 MB y selecciona **Guardar imagen**. El servidor guarda el archivo en `uploads/` y actualiza `producto.ruta_imagen`; el catálogo carga la imagen desde esa ruta.

Las imágenes se guardan en el disco del servidor. En producción, usa un disco persistente y sirve la aplicación y el API por HTTPS. La clave no se guarda en el navegador y se debe volver a ingresar al abrir el administrador.
