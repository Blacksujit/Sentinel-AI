/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Design tokens (from tokens.css)
        background: 'rgb(var(--paper-rgb) / <alpha-value>)',
        surface: 'rgb(var(--paper-sunken-rgb) / <alpha-value>)',
        foreground: 'rgb(var(--ink-rgb) / <alpha-value>)',
        border: 'rgb(var(--line-rgb) / <alpha-value>)',
        input: 'rgb(var(--line-strong-rgb) / <alpha-value>)',
        ring: 'rgb(var(--red-rgb) / <alpha-value>)',

        // shadcn-style nested roles
        primary: {
          DEFAULT: 'rgb(var(--red-rgb) / <alpha-value>)',
          foreground: 'rgb(255, 255, 255)',
        },
        destructive: {
          DEFAULT: 'rgb(var(--red-rgb) / <alpha-value>)',
          foreground: 'rgb(255, 255, 255)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--paper-sunken-rgb) / <alpha-value>)',
          foreground: 'rgb(var(--ink-rgb) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'rgb(var(--paper-sunken-rgb) / <alpha-value>)',
          foreground: 'rgb(var(--ink-soft-rgb) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--paper-sunken-rgb) / <alpha-value>)',
          foreground: 'rgb(var(--ink-rgb) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'rgb(var(--paper-raised-rgb) / <alpha-value>)',
          foreground: 'rgb(var(--ink-rgb) / <alpha-value>)',
        },
        card: {
          DEFAULT: 'rgb(var(--paper-raised-rgb) / <alpha-value>)',
          foreground: 'rgb(var(--ink-rgb) / <alpha-value>)',
        },

        // Risk levels
        risk: {
          low: 'rgb(var(--green-rgb) / <alpha-value>)',
          medium: 'rgb(var(--amber-rgb) / <alpha-value>)',
          high: 'rgb(var(--red-rgb) / <alpha-value>)',
          critical: 'rgb(var(--red-rgb) / <alpha-value>)',
        },

        // Semantic helpers
        success: 'rgb(var(--green-rgb) / <alpha-value>)',
        warning: 'rgb(var(--amber-rgb) / <alpha-value>)',
        danger: 'rgb(var(--red-rgb) / <alpha-value>)',
        info: 'rgb(var(--red-rgb) / <alpha-value>)',

        // Remap Tailwind defaults to warm-paper tokens (kill blue/purple/indigo)
        blue: { '500': 'rgb(var(--red-rgb) / <alpha-value>)', '600': 'rgb(var(--red-rgb) / <alpha-value>)' },
        indigo: { '500': 'rgb(var(--ink-soft-rgb) / <alpha-value>)', '600': 'rgb(var(--ink-rgb) / <alpha-value>)' },
        purple: { '500': 'rgb(var(--ink-soft-rgb) / <alpha-value>)', '600': 'rgb(var(--ink-rgb) / <alpha-value>)' },

        // Legacy electric palette mapped to warm-paper tokens
        electric: {
          blue: 'rgb(var(--red-rgb) / <alpha-value>)',
          violet: 'rgb(var(--ink-soft-rgb) / <alpha-value>)',
          teal: 'rgb(var(--green-rgb) / <alpha-value>)',
          amber: 'rgb(var(--amber-rgb) / <alpha-value>)',
          emerald: 'rgb(var(--green-rgb) / <alpha-value>)',
          rose: 'rgb(var(--red-rgb) / <alpha-value>)',
        },
      },
      backgroundImage: {
        'gradient-warm': 'linear-gradient(135deg, var(--paper) 0%, var(--paper-sunken) 100%)',
        'gradient-risk': 'linear-gradient(135deg, var(--red) 0%, var(--red) 100%)',
        'gradient-success': 'linear-gradient(135deg, var(--green) 0%, var(--green) 100%)',
        'gradient-warning': 'linear-gradient(135deg, var(--amber) 0%, var(--amber) 100%)'
      },
      boxShadow: {
        'card': 'var(--shadow-sm)',
        'card-lg': 'var(--shadow-md)',
        'premium': 'var(--shadow-md)'
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem'
      }
    },
  },
  plugins: [],
}
