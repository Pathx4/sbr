/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#fbfcfd',
        foreground: '#1E293B',
        muted: '#F1F5F9',
        'muted-foreground': '#64748B',
        accent: '#6C63FF',
        'accent-secondary': '#4D7CFF',
        primary: '#6C63FF',
        border: 'rgba(148, 163, 184, 0.2)',
        card: '#fbfcfd',
        ring: '#6C63FF',
      },
      fontFamily: {
        sans: ['Sarabun', 'system-ui', 'sans-serif'],
        serif: ['Calistoga', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'accent': '0 4px 14px rgba(108, 99, 255, 0.25)',
        'accent-lg': '0 8px 24px rgba(108, 99, 255, 0.35)',
        'neumorph': '9px 9px 16px rgba(163, 177, 198, 0.4), -9px -9px 16px rgba(255, 255, 255, 0.8)',
        'neumorph-hover': '14px 14px 28px rgba(163, 177, 198, 0.5), -14px -14px 28px rgba(255, 255, 255, 0.9)',
        'neumorph-inset': 'inset 6px 6px 10px rgba(163, 177, 198, 0.6), inset -6px -6px 10px rgba(255, 255, 255, 0.5)',
        'neumorph-inset-sm': 'inset 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
      }
    },
  },
  plugins: [],
}
