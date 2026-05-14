export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--bg-color) / <alpha-value>)',
        card: 'rgb(var(--bg-card) / <alpha-value>)',
        surface: 'rgb(var(--bg-surface) / <alpha-value>)',
        'surface-hover': 'rgb(var(--bg-surface-hover) / <alpha-value>)',
        foreground: 'rgb(var(--text-color) / <alpha-value>)',
        'muted-foreground': 'rgb(var(--text-muted) / <alpha-value>)',
        'dim-foreground': 'rgb(var(--text-dim) / <alpha-value>)',
        'foreground-inverse': 'rgb(var(--text-inverse) / <alpha-value>)',
        border: 'rgb(var(--border-color) / <alpha-value>)',
        'border-strong': 'rgb(var(--border-strong) / <alpha-value>)',
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
}
