import type { Metadata, Viewport } from "next";
import { ThemeProvider, ToasterThemed } from "@/components/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "TillText: WhatsApp ordering for local businesses", template: "%s · TillText" },
  description: "An AI assistant that takes orders for restaurants and shops on WhatsApp, in your customers' language.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#E35413" },
    { media: "(prefers-color-scheme: dark)", color: "#141110" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen font-sans">
        <ThemeProvider>
          {children}
          <ToasterThemed />
        </ThemeProvider>
      </body>
    </html>
  );
}
