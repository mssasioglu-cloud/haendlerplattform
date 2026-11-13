import type { Metadata, Viewport } from "next";
import { Geist, Barlow_Condensed, IBM_Plex_Mono } from "next/font/google";
import { site } from "@/config/site";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const display = Barlow_Condensed({ variable: "--font-barlow", subsets: ["latin"], weight: ["600", "700", "800"] });
const mono = IBM_Plex_Mono({ variable: "--font-plex", subsets: ["latin"], weight: ["500", "600"] });

export const metadata: Metadata = {
  title: { default: `${site.name} – ${site.claim}`, template: `%s · ${site.name}` },
  description:
    "B2B-Fahrzeugbörse nur für Gewerbetreibende: unbegrenzt inserieren zum Festpreis, Inzahlungnahmen schnell an Händlerkollegen vermitteln.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#12181c" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${geistSans.variable} ${display.variable} ${mono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
