import type { Metadata, Viewport } from "next";
import { Lato } from "next/font/google";
import "./globals.css";
import { BottomNav, Footer, Header } from "@/components/layout/site-chrome";
import { A11Y_BOOT_SCRIPT } from "@/components/layout/a11y-toolbar";
import { RouteFocus } from "@/components/layout/route-focus";
import { Providers } from "@/components/providers";

// Lato — krój z identyfikacji zus.pl; swap zapobiega niewidocznemu tekstowi (font-loading)
const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Przewodnik Rodzica — świadczenia z ZUS",
    template: "%s · Przewodnik Rodzica",
  },
  description:
    "Sprawdź, jakie świadczenia z ZUS przysługują Ci w ciąży i po urodzeniu dziecka: ile, jak długo, gdzie złożyć wniosek i na co uważać.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#007834",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pl" className={lato.variable} suppressHydrationWarning>
      <head>
        {/* Ustawienia dostępności przed pierwszym renderem — bez migania */}
        <script dangerouslySetInnerHTML={{ __html: A11Y_BOOT_SCRIPT }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <Providers>
          <Header />
          <RouteFocus />
          <main id="tresc" className="flex-1 outline-none">
            {children}
          </main>
          <Footer />
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
