import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SideRail, TabBar } from "@/components/layout/site-nav";
import { AgentStatusProvider } from "@/hooks/use-agent-status";

/** Dashboard shell: navy sidebar (desktop) or tab bar (phone) around every app route. Only the app polls the agent service. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AgentStatusProvider>
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
  );
}
