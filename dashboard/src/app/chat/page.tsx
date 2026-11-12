import { Suspense } from "react";
import { ChatLive } from "@/components/chat/chat-live";
import { Skeleton } from "@/components/ui/states";
import { loadOverview } from "@/lib/overview";

export const revalidate = 15;
export const metadata = { title: "Chat agen | Koelakan" };

export default async function ChatPage() {
  const { data } = await loadOverview();
  return (
    <>
      <h1 className="font-display text-4xl font-bold tracking-tight">Chat agen</h1>
      <p className="mb-6 mt-2 max-w-2xl text-ink-soft">
        Begini rasanya bagi pemilik warung: agen melapor dalam bahasa sehari-hari, tanpa perlu membaca blok atau hash.
      </p>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <ChatLive initial={data} />
      </Suspense>
    </>
  );
}
