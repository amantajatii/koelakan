import { Suspense } from "react";
import { ChatLive } from "@/components/chat/chat-live";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/states";
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
      <Suspense fallback={<Skeleton className="h-[34rem]" />}>
        <ChatLive initial={data} />
      </Suspense>
    </>
  );
}
