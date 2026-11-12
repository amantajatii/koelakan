import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import "@near-wallet-selector/modal-ui/styles.css";
import "./globals.css";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WalletProvider } from "@/lib/wallet";

const display = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", axes: ["opsz"] });
const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-sans-body" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-mono-num" });

export const metadata: Metadata = {
  title: "Koelakan: kulakan bareng, harga grosir untuk warung",
  description:
    "Agen warung patungan jadi satu pesanan, agen grosir bersaing lewat lelang tawaran tersegel, kontrak NEAR menahan dana dan menegakkan batas pemilik.",
};

export const viewport: Viewport = { themeColor: "#ecdfc5", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <WalletProvider>
          <a
            href="#isi"
            className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-ink focus:px-3 focus:py-2 focus:text-cream"
          >
            Lompat ke isi halaman
          </a>
          <SiteHeader />
          <main id="isi" className="mx-auto w-full max-w-6xl px-4 pb-20 pt-6 sm:px-6 sm:pt-10">
            {children}
          </main>
          <SiteFooter />
        </WalletProvider>
      </body>
    </html>
  );
}
