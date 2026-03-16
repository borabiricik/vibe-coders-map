import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Vibe Coders Map - See Who's Vibe Coding Right Now",
  description:
    "A live global map showing developers using AI coding tools like Cursor, Claude Code, Windsurf, and more.",
  openGraph: {
    title: "Vibe Coders Map",
    description: "See who's vibe coding around the world, right now.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://unpkg.com/maplibre-gl@5/dist/maplibre-gl.css"
          rel="stylesheet"
        />
      </head>
      <body className="bg-gray-950 text-white antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
