# LUNA FASHION 🌙

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
