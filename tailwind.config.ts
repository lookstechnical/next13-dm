import { type Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", "class"],
  content: ["./app/**/*.{ts,tsx}"],
  safelist: [
    {
      pattern: /(bg-(red|green|blue)-(100|200|300|400|500|600|700|800|900))/,
    },
  ],
  theme: {
  	extend: {
  		colors: {
  			background: '#0F111A',
  			wkbackground: '#1A1D2D',
  			card: '#0F111A',
  			border: '#2C2F3C',
  			input: '#4b5563',
  			ring: '#F8FAFC',
  			primary: '#FF0000',
  			secondary: '#1E88E5',
  			destructive: '#EF4444',
  			muted: '#94A3B8',
  			accent: '#3B82F6',
  			popover: '#1A1D2D',
  			foreground: '#F8FAFC',
  			success: '#2CFF05',
  			blue: '#1E88E5'
  		},
  		borderColor: {
  			card: '#000000'
  		},
  		borderRadius: {
  			lg: '0rem',
  			md: '0rem',
  			sm: '0rem'
  		},
  		fontFamily: {
  			sans: [
  				'Inter',
  				'sans-serif'
  			]
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
  plugins: [require("tailwindcss-animate")],
};
export default config;
