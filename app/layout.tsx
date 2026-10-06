import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Drop Radar | Pokémon Leipzig",
  description: "Pokémon 30 Jahre: Filialkarte und belegte Vor-Ort-Hinweise für Leipzig und Umgebung.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Drop Radar", statusBarStyle: "default" },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="antialiased">{children}</body>
    </html>
  );
}
