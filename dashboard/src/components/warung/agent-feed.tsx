import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import { Bubble } from "@/components/chat/bubble";
import { Panel, SectionTitle, linkClass } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";
import { chatHref, type FeedResult } from "@/lib/agent-feed";

/** The latest few things the agent told this owner, in the same plain words as the Agent chat page. */
export function AgentFeed({ account, feed }: { account: string; feed: FeedResult }) {
  return (
    <Panel aria-labelledby="agent-feed">
      <SectionTitle aside={<Link href={chatHref(account, feed.latestRoundId)} className={`${linkClass} inline-flex items-center gap-1 text-sm`}>Open full chat <ArrowRight className="size-4" aria-hidden /></Link>}>
        <span id="agent-feed">From your agent</span>
      </SectionTitle>
      {feed.messages.length === 0 ? (
        <EmptyState title="No messages yet" icon={MessageCircle} className="py-7">
          Once your agent joins a round it reports here in plain words: what it bought, at what price, and when the goods are due.
        </EmptyState>
      ) : (
        <ol aria-label="Latest messages from your agent" className="-mx-1 flex flex-col gap-2.5 rounded-2xl bg-ground/70 p-3">
          {feed.messages.map((m) => <Bubble key={m.id} message={m} showSender={false} />)}
        </ol>
      )}
    </Panel>
  );
}
