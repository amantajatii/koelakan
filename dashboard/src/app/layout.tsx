import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import "@near-wallet-selector/modal-ui/styles.css";
import "./globals.css";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { AgentStatusProvider } from "@/hooks/use-agent-status";
import { config } from "@/lib/config";
import { WalletProvider } from "@/lib/wallet";

const display = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", axes: ["opsz"] });
const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-sans-body" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-mono-num" });

const TITLE = "Koelakan: group restocking, wholesale prices for warungs";
const DESCRIPTION =
  "Warung agents pool their orders into one round, grosir (wholesaler) agents compete in a sealed-bid auction, and a NEAR contract escrows the funds and enforces owner limits.";

export const metadata: Metadata = {
  metadataBase: new URL(config.siteUrl),
  title: { default: TITLE, template: "%s | Koelakan" },
  description: DESCRIPTION,
  applicationName: "Koelakan",
  openGraph: { type: "website", siteName: "Koelakan", title: TITLE, description: DESCRIPTION, locale: "en" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export const viewport: Viewport = { themeColor: "#ecdfc5", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <WalletProvider>
          <AgentStatusProvider>
          <a
            href="#content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-ink focus:px-3 focus:py-2 focus:text-cream"
          >
            Skip to content
          </a>
          <SiteHeader />
          <main id="content" className="mx-auto w-full max-w-6xl px-4 pb-20 pt-6 sm:px-6 sm:pt-10">
            {children}
          </main>
          <SiteFooter />
          </AgentStatusProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
