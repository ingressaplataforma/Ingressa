import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata = {
  title: "Ingressa — Ingressos para eventos",
  description:
    "Venda inscrições para retiros, congressos e encontros com repasse antecipado e taxa transparente.",
  manifest: "/manifest.json",
  icons: {
    icon: "/ingressa_favicon.png",
    apple: "/ingressa_favicon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={`${fraunces.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
