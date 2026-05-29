# Design System — Didactifonis

> Fuente de verdad visual. Convierte el Brandbook en código verificable.
> El agente `didactifonis-frontend` debe consumir **estos tokens**, nunca valores sueltos.

## 1. Paleta de colores

| Token | Nombre | HEX | Uso |
| :-- | :-- | :-- | :-- |
| `primary` | Turquesa Principal | `#18C7D1` | Marca, elementos interactivos clave |
| `accent` | Azul Eléctrico | `#4C8DFF` | Botones de acción, acentos UI |
| `creative` | Morado Creativo | `#9A6BFF` | Áreas lúdicas, imaginación/juego |
| `energy` | Naranja Energía | `#FF8A3D` | Motivación, CTAs, alertas positivas |
| `optimism` | Amarillo Optimismo | `#FFD24A` | Logros, estrellas, recompensas |
| `white` | Blanco | `#FFFFFF` | Fondos limpios, tarjetas |
| `surface` | Gris Claro | `#F5F7FA` | Fondos de sección, estructuras secundarias |
| `text-soft` | Gris Texto | `#5F6B7A` | Párrafos y texto descriptivo |
| `text-strong` | Azul Oscuro Texto | `#1B2A41` | Títulos y texto de alta legibilidad |

## 2. Gradientes oficiales

- **Principal (UI / headers):** `#18C7D1` → `#4C8DFF`
- **Creativo (lúdico):** `#4C8DFF` → `#9A6BFF`
- **Energético (recompensas / acciones):** `#FF8A3D` → `#FFD24A`

## 3. Tipografía

- **Poppins** — títulos, botones, UI. Moderna y redondeada.
- **Nunito Sans** — cuerpo de texto, párrafos, descripciones.

## 4. Forma y profundidad

- Botones e inputs: `border-radius` ≥ `0.75rem` (`rounded-xl`).
- Tarjetas: `border-radius` ≥ `1rem` (`rounded-2xl`).
- Sombras suaves y sutiles. Microinteracciones ligeras (*bounce* / *fade*).

## 5. Prohibiciones absolutas

- Sin neones, *sci-fi glows*, *lens flares* ni brillos artificiales.
- Iluminación siempre limpia, natural y realista.
- Iconografía *rounded*, de grosor uniforme.

---

## 6. Tokens como CSS (Tailwind v4 — bloque `@theme`)

```css
@import "tailwindcss";

@theme {
  --color-primary: #18C7D1;
  --color-accent: #4C8DFF;
  --color-creative: #9A6BFF;
  --color-energy: #FF8A3D;
  --color-optimism: #FFD24A;
  --color-surface: #F5F7FA;
  --color-text-soft: #5F6B7A;
  --color-text-strong: #1B2A41;

  --font-heading: "Poppins", sans-serif;
  --font-body: "Nunito Sans", sans-serif;

  --radius-button: 0.75rem;
  --radius-card: 1rem;
}

:root {
  --gradient-main: linear-gradient(135deg, #18C7D1, #4C8DFF);
  --gradient-creative: linear-gradient(135deg, #4C8DFF, #9A6BFF);
  --gradient-energy: linear-gradient(135deg, #FF8A3D, #FFD24A);
}
```

## 7. Tokens como `tailwind.config.js` (Tailwind v3)

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#18C7D1",
        accent: "#4C8DFF",
        creative: "#9A6BFF",
        energy: "#FF8A3D",
        optimism: "#FFD24A",
        surface: "#F5F7FA",
        "text-soft": "#5F6B7A",
        "text-strong": "#1B2A41",
      },
      fontFamily: {
        heading: ['"Poppins"', "sans-serif"],
        body: ['"Nunito Sans"', "sans-serif"],
      },
      borderRadius: {
        button: "0.75rem",
        card: "1rem",
      },
      backgroundImage: {
        "gradient-main": "linear-gradient(135deg, #18C7D1, #4C8DFF)",
        "gradient-creative": "linear-gradient(135deg, #4C8DFF, #9A6BFF)",
        "gradient-energy": "linear-gradient(135deg, #FF8A3D, #FFD24A)",
      },
    },
  },
  plugins: [],
};
```

> Usa el bloque que corresponda a tu versión de Tailwind. Verifica la versión instalada
> antes de elegir; no mezcles ambos enfoques.
