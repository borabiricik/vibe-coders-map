import { heroui } from "@heroui/react";

export default heroui({
  defaultTheme: "dark",
  defaultExtendTheme: "dark",
  layout: {
    radius: {
      small: "0.875rem",
      medium: "1rem",
      large: "1.5rem",
    },
    borderWidth: {
      small: "1px",
      medium: "1px",
      large: "1px",
    },
  },
  themes: {
    dark: {
      colors: {
        background: "#020617",
        foreground: "#F8FAFC",
        divider: "rgba(148, 163, 184, 0.16)",
        overlay: "rgba(2, 6, 23, 0.82)",
        focus: "#22D3EE",
        content1: "#0F172A",
        content2: "#111827",
        content3: "#1E293B",
        content4: "#334155",
        primary: {
          DEFAULT: "#22D3EE",
          foreground: "#082F49",
        },
        secondary: {
          DEFAULT: "#8B5CF6",
          foreground: "#F5F3FF",
        },
        success: {
          DEFAULT: "#22C55E",
          foreground: "#052E16",
        },
        warning: {
          DEFAULT: "#F59E0B",
          foreground: "#451A03",
        },
        danger: {
          DEFAULT: "#F43F5E",
          foreground: "#FFF1F2",
        },
        default: {
          DEFAULT: "#CBD5E1",
          foreground: "#020617",
        },
      },
    },
  },
});
