import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
    darkMode: ["class"],
    content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		fontFamily: {
  			sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', 'var(--font-geist-sans)', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  			mono: ['ui-monospace', '"SF Mono"', 'SFMono-Regular', 'var(--font-geist-mono)', 'Menlo', 'monospace'],
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
  				foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
  				hover: 'hsl(var(--primary-hover) / <alpha-value>)',
  				active: 'hsl(var(--primary-active) / <alpha-value>)',
  				subtle: 'hsl(var(--primary-subtle) / <alpha-value>)',
  				border: 'hsl(var(--primary-border) / <alpha-value>)',
  				'50': 'hsl(var(--primary-50) / <alpha-value>)',
  				'100': 'hsl(var(--primary-100) / <alpha-value>)',
  				'200': 'hsl(var(--primary-200) / <alpha-value>)',
  				'300': 'hsl(var(--primary-300) / <alpha-value>)',
  				'400': 'hsl(var(--primary-400) / <alpha-value>)',
  				'500': 'hsl(var(--primary-500) / <alpha-value>)',
  				'600': 'hsl(var(--primary-600) / <alpha-value>)',
  				'700': 'hsl(var(--primary-700) / <alpha-value>)',
  				'800': 'hsl(var(--primary-800) / <alpha-value>)',
  				'900': 'hsl(var(--primary-900) / <alpha-value>)',
  				'950': 'hsl(var(--primary-950) / <alpha-value>)'
  			},
  			success: 'hsl(var(--success) / <alpha-value>)',
  			warning: 'hsl(var(--warning) / <alpha-value>)',
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		borderRadius: {
  			sm: '8px',
  			md: '10px',
  			lg: '12px',
  			xl: '16px',
  			'2xl': '20px',
  			'3xl': '24px',
  			float: '28px'
  		},
  		boxShadow: {
  			'elev-1': 'var(--shadow-1)',
  			'elev-2': 'var(--shadow-2)',
  			'elev-3': 'var(--shadow-3)',
  			'elev-4': 'var(--shadow-4)'
  		},
  		transitionTimingFunction: {
  			'out-expo': 'var(--ease-out)'
  		},
  		minHeight: {
  			custom: '600px'
  		},
  		minWidth: {
  			custom: '700px'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [tailwindcssAnimate],

} satisfies Config;
