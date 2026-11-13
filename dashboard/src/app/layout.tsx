import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "@near-wallet-selector/modal-ui/styles.css";
import "./globals.css";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SideRail, TabBar } from "@/components/layout/site-nav";
import { AgentStatusProvider } from "@/hooks/use-agent-status";
import { config } from "@/lib/config";
import { WalletProvider } from "@/lib/wallet";

// Plus Jakarta Sans: a geometric sans drawn for Jakarta, the city this product is about.
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

const TITLE = "Koelakan: Warungs pool orders. Grosirs bid for them.";
const DESCRIPTION = "Group restocking for Indonesian warungs on NEAR testnet, priced against real PIHPS data.";

export const metadata: Metadata = {
  metadataBase: new URL(config.siteUrl),
  title: { default: TITLE, template: "%s | Koelakan" },
  description: DESCRIPTION,
  applicationName: "Koelakan",
  openGraph: { type: "website", siteName: "Koelakan", title: TITLE, description: DESCRIPTION, locale: "en" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export const viewport: Viewport = { themeColor: "#f4f4ef", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body>
        <WalletProvider>
          <AgentStatusProvider>
          <a
            href="#content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-xl focus:bg-night focus:px-4 focus:py-2.5 focus:text-white focus-visible:outline-brand"
          >
            Skip to content
          </a>
          <SideRail />
          <div className="lg:pl-[16.5rem]">
            <SiteHeader />
            <main id="content" tabIndex={-1} className="mx-auto w-full max-w-[84rem] px-4 pb-6 pt-1 sm:px-8">
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
