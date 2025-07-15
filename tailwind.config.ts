
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0", opacity: "0" },
          to: { height: "var(--radix-accordion-content-height)", opacity: "1" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)", opacity: "1" },
          to: { height: "0", opacity: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-out": {
          "0%": { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(10px)" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "scale-out": {
          from: { transform: "scale(1)", opacity: "1" },
          to: { transform: "scale(0.95)", opacity: "0" },
        },
        "slide-in-right": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "slide-out-right": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(100%)" },
        },
        "slide-in-left": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "slide-in-up": {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "pulse-soft": {
          "0%, 100%": {
            opacity: "1",
          },
          "50%": {
            opacity: "0.8",
          },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "spin-reverse": {
          from: { transform: "rotate(360deg)" },
          to: { transform: "rotate(0deg)" },
        },
        "pulse-subtle": {
          "0%, 100%": {
            transform: "scale(1)",
            opacity: "1",
          },
          "50%": {
            transform: "scale(1.05)",
            opacity: "0.9",
          },
        },
        "pulse-3d": {
          "0%, 100%": {
            transform: "scale(1) translateZ(0)",
          },
          "50%": {
            transform: "scale(1.1) translateZ(20px)",
          },
        },
        "float-logo": {
          "0%, 100%": {
            transform: "translateY(0) rotateX(-5deg)",
          },
          "50%": {
            transform: "translateY(-10px) rotateX(-5deg)",
          },
        },
        "float-1": {
          "0%, 100%": {
            transform: "translateY(0) translateX(0)",
            opacity: "0",
          },
          "10%": {
            opacity: "0.7",
          },
          "90%": {
            opacity: "0.7",
          },
          "50%": {
            transform: "translateY(-20px) translateX(10px)",
          },
        },
        "float-2": {
          "0%, 100%": {
            transform: "translateY(0) translateX(0)",
            opacity: "0",
          },
          "10%": {
            opacity: "0.7",
          },
          "90%": {
            opacity: "0.7",
          },
          "50%": {
            transform: "translateY(-30px) translateX(-10px)",
          },
        },
        "float-3": {
          "0%, 100%": {
            transform: "translateY(0) translateX(0)",
            opacity: "0",
          },
          "10%": {
            opacity: "0.7",
          },
          "90%": {
            opacity: "0.7",
          },
          "50%": {
            transform: "translateY(-25px) translateX(-15px)",
          },
        },
        "float-4": {
          "0%, 100%": {
            transform: "translateY(0) translateX(0) scale(1)",
            opacity: "0",
          },
          "10%": {
            opacity: "0.6",
          },
          "90%": {
            opacity: "0.6",
          },
          "50%": {
            transform: "translateY(-35px) translateX(20px) scale(1.2)",
          },
        },
        "float-5": {
          "0%, 100%": {
            transform: "translateY(0) translateX(0) scale(1)",
            opacity: "0",
          },
          "10%": {
            opacity: "0.6",
          },
          "90%": {
            opacity: "0.6",
          },
          "50%": {
            transform: "translateY(-40px) translateX(-20px) scale(1.3)",
          },
        },
        "orbit": {
          from: {
            transform: "rotate(0deg)",
          },
          to: {
            transform: "rotate(360deg)",
          },
        },
        "shimmer": {
          "0%": {
            transform: "translateX(-100%)",
          },
          "100%": {
            transform: "translateX(200%)",
          },
        },
        "energy-burst": {
          "0%, 100%": {
            transform: "scale(0.8)",
            opacity: "0",
          },
          "50%": {
            transform: "scale(1.2)",
            opacity: "0.3",
          },
        },
        "glow": {
          "0%, 100%": {
            filter: "brightness(1)",
            textShadow: "0 0 5px rgba(15, 157, 88, 0.3)",
          },
          "50%": {
            filter: "brightness(1.2)",
            textShadow: "0 0 20px rgba(15, 157, 88, 0.6)",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "fade-out": "fade-out 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "scale-out": "scale-out 0.2s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "slide-out-right": "slide-out-right 0.3s ease-out",
        "slide-in-left": "slide-in-left 0.3s ease-out",
        "slide-in-up": "slide-in-up 0.4s ease-out",
        "pulse-soft": "pulse-soft 2s infinite ease-in-out",
        "spin-slow": "spin-slow 8s linear infinite",
        "spin-reverse": "spin-reverse 6s linear infinite",
        "pulse-subtle": "pulse-subtle 3s ease-in-out infinite",
        "pulse-3d": "pulse-3d 2s ease-in-out infinite",
        "float-logo": "float-logo 3s ease-in-out infinite",
        "float-1": "float-1 4s ease-in-out infinite",
        "float-2": "float-2 4s ease-in-out infinite 0.5s",
        "float-3": "float-3 4s ease-in-out infinite 1s",
        "float-4": "float-4 5s ease-in-out infinite 1.5s",
        "float-5": "float-5 5s ease-in-out infinite 2s",
        "orbit": "orbit 20s linear infinite",
        "shimmer": "shimmer 3s ease-in-out infinite",
        "energy-burst": "energy-burst 4s ease-in-out infinite",
        "glow": "glow 2s ease-in-out infinite",
      },
      boxShadow: {
        glass: "0 4px 30px rgba(0, 0, 0, 0.1)",
        subtle: "0 2px 10px rgba(0, 0, 0, 0.05)",
        elevated: "0 10px 30px rgba(0, 0, 0, 0.08)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
