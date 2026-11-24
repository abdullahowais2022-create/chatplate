import type { Metadata, Viewport } from "next";
import { ThemeProvider, ToasterThemed } from "@/components/theme";
import "@fontsource-variable/instrument-sans";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";

export function generateMetadata(): Metadata {
  // Meta business/domain verification: set META_DOMAIN_VERIFICATION in Vercel to the code Meta gives you.
  const fbVerify = process.env.META_DOMAIN_VERIFICATION?.trim();
  return {
    title: { default: "TillText: WhatsApp ordering for local businesses", template: "%s · TillText" },
    description: "An AI assistant that takes orders for restaurants and shops on WhatsApp, in your customers' language.",
    robots: { index: false, follow: false },
    ...(fbVerify ? { other: { "facebook-domain-verification": fbVerify } } : {}),
  };
}

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
