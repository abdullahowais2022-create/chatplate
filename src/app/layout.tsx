import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "TillText: WhatsApp ordering for local businesses", template: "%s · TillText" },
  description: "An AI assistant that takes orders for restaurants and shops on WhatsApp, in your customers' language.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#E35413", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">
        {children}
        <Toaster richColors position="top-right" closeButton />
      </body>
    </html>
  );
}
