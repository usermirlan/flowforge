import type { Metadata, Viewport } from "next";
import "@fontsource-variable/geist/wght.css";
import "@fontsource-variable/geist-mono/wght.css";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "FlowForge — визуалдык автоматташтыруу",
  description: "Блокторду туташтырып, коддосуз автоматтык процесстерди түзүңүз: webhook, cron, HTTP, Telegram, AI.",
};

export const viewport: Viewport = { themeColor: "#0a0b0f" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ky">
      <body className="min-h-screen font-sans antialiased">
        <Header />
        {children}
      </body>
    </html>
  );
}
