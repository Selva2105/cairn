import type { Config } from 'tailwindcss';
// Import via the dedicated `./theme` subpath, not the `@cairn/ui` barrel -- the barrel also
// re-exports form.tsx (react-hook-form), and pulling that into the config's Node-based
// evaluation (jiti) drags in a client-only module graph that fails to resolve there.
import { clay, moss } from '@cairn/ui/theme';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}', '../../libs/ui/src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1.5rem',
      screens: { '2xl': '1280px' },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        // raw scales for one-off utility classes, e.g. bg-clay-100
        clay,
        moss,
      },
      borderRadius: {
        '2xl': 'calc(var(--radius) + 6px)',
        xl: 'calc(var(--radius) + 2px)',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        glass:
          '0 8px 30px 0 rgba(0, 0, 0, 0.04), 0 1px 3px 0 rgba(0, 0, 0, 0.02)',
        'glass-hover':
          '0 14px 40px 0 rgba(0, 0, 0, 0.08), 0 2px 6px 0 rgba(0, 0, 0, 0.04)',
        'glass-lg':
          '0 20px 50px -10px rgba(0, 0, 0, 0.12), 0 4px 12px -2px rgba(0, 0, 0, 0.04)',
        'glow-primary': '0 0 24px -2px rgba(189, 91, 44, 0.35)',
        'glow-primary-sm': '0 0 14px -2px rgba(189, 91, 44, 0.25)',
        'glow-success': '0 0 20px -2px rgba(76, 150, 81, 0.3)',
        'inner-glow': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.25)',
        'inner-glow-subtle': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.12)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(25px, -35px) scale(1.08)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.95)' },
        },
        'float-reverse': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(-30px, 30px) scale(1.05)' },
          '66%': { transform: 'translate(25px, -20px) scale(0.92)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'float-slow': 'float-slow 20s ease-in-out infinite',
        'float-reverse': 'float-reverse 24s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
