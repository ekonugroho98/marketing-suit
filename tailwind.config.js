/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Aurora Glass Dark Mode Palette
        base: {
          DEFAULT: '#0b0d14',
          50: '#12151f',
          100: '#181c29',
          200: '#1e232f',
          300: '#252a38',
        },
        surface: 'rgba(255, 255, 255, 0.05)',
        elevated: 'rgba(255, 255, 255, 0.08)',

        // Glass tokens
        glass: {
          bg: 'rgba(255, 255, 255, 0.04)',
          border: 'rgba(255, 255, 255, 0.08)',
          hover: 'rgba(255, 255, 255, 0.12)',
        },

        // Accent colors
        accent: {
          indigo: '#818cf8',
          cyan: '#22d3ee',
          purple: '#a78bfa',
          blue: '#60a5fa',
        },

        // Semantic colors
        success: '#34d399',
        warning: '#fbbf24',
        danger: '#f87171',

        // Text colors
        'text-primary': '#eef0f6',
        'text-secondary': 'rgba(255, 255, 255, 0.45)',
        'text-tertiary': 'rgba(255, 255, 255, 0.30)',

        // Legacy color support (mapped to new system)
        primary: {
          50: 'rgba(129, 140, 248, 0.1)',
          100: 'rgba(129, 140, 248, 0.2)',
          200: 'rgba(129, 140, 248, 0.3)',
          300: 'rgba(129, 140, 248, 0.4)',
          400: 'rgba(129, 140, 248, 0.6)',
          500: '#818cf8',
          600: '#6366f1',
          700: '#4f46e5',
          800: '#4338ca',
          900: '#3730a3',
        },
        warning: {
          50: 'rgba(251, 191, 36, 0.1)',
          100: 'rgba(251, 191, 36, 0.2)',
          200: 'rgba(251, 191, 36, 0.3)',
          300: 'rgba(251, 191, 36, 0.4)',
          400: 'rgba(251, 191, 36, 0.6)',
          500: '#fbbf24',
          600: '#f59e0b',
          700: '#d97706',
          800: '#b45309',
          900: '#92400e',
        },
        danger: {
          50: 'rgba(248, 113, 113, 0.1)',
          100: 'rgba(248, 113, 113, 0.2)',
          200: 'rgba(248, 113, 113, 0.3)',
          300: 'rgba(248, 113, 113, 0.4)',
          400: 'rgba(248, 113, 113, 0.6)',
          500: '#f87171',
          600: '#ef4444',
          700: '#dc2626',
          800: '#b91c1c',
          900: '#991b1b',
        },
        sidebar: '#0a0c12',
      },
      backdropBlur: {
        glass: '28px',
      },
      backdropSaturate: {
        glass: '200%',
      },
      animation: {
        'aurora-drift': 'aurora-drift 20s ease-in-out infinite',
        'aurora-drift-slow': 'aurora-drift 30s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
      },
      keyframes: {
        'aurora-drift': {
          '0%, 100%': {
            transform: 'translate(0, 0) rotate(0deg) scale(1)',
          },
          '25%': {
            transform: 'translate(5%, 5%) rotate(90deg) scale(1.1)',
          },
          '50%': {
            transform: 'translate(-5%, 10%) rotate(180deg) scale(1)',
          },
          '75%': {
            transform: 'translate(10%, -5%) rotate(270deg) scale(1.05)',
          },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '0.8' },
        },
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0, 0, 0, 0.3)',
        'glass-hover': '0 12px 40px rgba(0, 0, 0, 0.4)',
        'glow-indigo': '0 0 40px rgba(129, 140, 248, 0.3)',
        'glow-cyan': '0 0 40px rgba(34, 211, 238, 0.3)',
        'glow-purple': '0 0 40px rgba(167, 139, 250, 0.3)',
      },
      borderRadius: {
        'glass': '16px',
      },
    },
  },
  plugins: [],
}
