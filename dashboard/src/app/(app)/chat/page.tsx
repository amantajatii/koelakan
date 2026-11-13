import { Suspense } from "react";
import { ChatLive } from "@/components/chat/chat-live";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingRegion, Skeleton } from "@/components/ui/states";
import { loadOverview } from "@/lib/overview";

export const revalidate = 15;
export const metadata = { title: "Agent chat" };

export default async function ChatPage() {
  const { data } = await loadOverview();
  return (
    <>
      <PageHeader title="Agent chat">
        This is what it feels like for a warung owner: the agent reports in plain language, with no blocks or hashes to read.
      </PageHeader>
      <Suspense fallback={<LoadingRegion label="Loading agent chat…"><Skeleton className="h-[34rem]" /></LoadingRegion>}>
        <ChatLive initial={data} />
      </Suspense>
    </>
  );
}
