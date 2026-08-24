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
        sans: ['Plus Jakarta Sans', 'Sarabun', 'sans-serif'],
        thai: ['Sarabun', 'sans-serif'],
        display: ['Outfit', 'Plus Jakarta Sans', 'Sarabun', 'sans-serif'],
        serif: ['Sarabun', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'accent': '0 4px 14px rgba(37, 99, 235, 0.25)',
        'accent-lg': '0 8px 24px rgba(37, 99, 235, 0.35)',
        'glow-blue': '0 0 20px -3px rgba(37, 99, 235, 0.35)',
        'glow-indigo': '0 0 20px -3px rgba(99, 102, 241, 0.35)',
        'glow-emerald': '0 0 20px -3px rgba(16, 185, 129, 0.35)',
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'card-hover': '0 12px 30px -4px rgba(15, 23, 42, 0.08), 0 4px 12px -2px rgba(15, 23, 42, 0.04)',
      },
      animation: {
        'pulse-subtle': 'softPulse 3s infinite ease-in-out',
        'shimmer': 'shimmer 2.5s infinite linear',
        'fade-in': 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }
    },
  },
  plugins: [],
}
