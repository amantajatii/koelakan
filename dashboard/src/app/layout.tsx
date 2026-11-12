import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import "@near-wallet-selector/modal-ui/styles.css";
import "./globals.css";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SideRail, TabBar } from "@/components/site-nav";
import { AgentStatusProvider } from "@/hooks/use-agent-status";
import { config } from "@/lib/config";
import { WalletProvider } from "@/lib/wallet";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree", display: "swap" });

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

export const viewport: Viewport = { themeColor: "#eef6f2", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={figtree.variable}>
      <body>
        <WalletProvider>
          <AgentStatusProvider>
          <a
            href="#content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-xl focus:bg-brand focus:px-4 focus:py-2.5 focus:text-white"
          >
            Skip to content
          </a>
          <SideRail />
          <div className="lg:pl-[5.75rem]">
            <SiteHeader />
            <main id="content" className="mx-auto w-full max-w-[78rem] px-4 pb-6 pt-2 sm:px-8">
              {children}
            </main>
            <SiteFooter />
          </div>
          <TabBar />
          </AgentStatusProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
