/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#f8fafc',
        foreground: '#1E293B',
        muted: '#F1F5F9',
        'muted-foreground': '#64748B',
        accent: '#6C63FF',
        'accent-secondary': '#4D7CFF',
        primary: '#2563eb',
        border: 'rgba(148, 163, 184, 0.2)',
        card: '#ffffff',
        ring: '#2563eb',
      },
      fontFamily: {
        sans: ['Sarabun', 'sans-serif'],
        display: ['Sarabun', 'sans-serif'],
        serif: ['Sarabun', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'accent': '0 4px 14px rgba(37, 99, 235, 0.25)',
        'accent-lg': '0 8px 24px rgba(37, 99, 235, 0.35)',
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
}
