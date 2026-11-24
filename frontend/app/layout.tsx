import type { Metadata, Viewport } from "next";
import { I18nProvider } from "@/components/I18n";
import { getDict, getLocale } from "@/lib/locale";
import "@fontsource-variable/geist/wght.css";
import "@fontsource-variable/geist-mono/wght.css";
import "./globals.css";
import Header from "@/components/Header";

export async function generateMetadata(): Promise<Metadata> {
  const d = await getDict();
  return { title: d.meta.title, description: d.meta.description };
}

export const viewport: Viewport = { themeColor: "#0a0b0f" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body className="min-h-screen font-sans antialiased">
        <I18nProvider locale={locale}>
          <Header />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
