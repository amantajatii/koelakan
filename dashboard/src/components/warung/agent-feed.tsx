"use client";

import Link from "next/link";
import { ArrowRight, Clock, MessageCircle } from "lucide-react";
import { Bubble } from "@/components/chat/bubble";
import { Panel, SectionTitle, linkClass } from "@/components/ui/panel";
import { useAgentStatus } from "@/hooks/use-agent-status";
import { useNow } from "@/hooks/use-now";
import { chatHref, type FeedResult } from "@/lib/agent-feed";
import { formatNextOpen } from "@/lib/status-format";

/** One line under the feed: when the next round opens, with a way into the full service status. */
function NextRoundLine() {
  const { status } = useAgentStatus();
  const now = useNow(0);
  return (
    <p className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-line pt-3 text-sm">
      <span className="flex items-center gap-2 text-muted">
        <Clock className="size-4 shrink-0 text-brand" aria-hidden />
        {status ? (
          <>Next round <strong className="num font-semibold text-ink">{now === 0 ? "..." : formatNextOpen(status.next_open_at, now)}</strong></>
        ) : (
          "Agent service offline. On-chain data is still live."
        )}
      </span>
      <Link href="/status" className={`${linkClass} inline-flex min-h-10 items-center gap-1.5`}>
        Full status <ArrowRight className="size-4" aria-hidden />
      </Link>
    </p>
  );
}

/** The latest few things the agent told this owner, in the same plain words as the Agent chat page. */
export function AgentFeed({ account, feed }: { account: string; feed: FeedResult }) {
  return (
    <Panel aria-labelledby="agent-feed">
      <SectionTitle aside={<Link href={chatHref(account, feed.latestRoundId)} className={`${linkClass} inline-flex items-center gap-1 text-sm`}>Open full chat <ArrowRight className="size-4" aria-hidden /></Link>}>
        <span id="agent-feed">From your agent</span>
      </SectionTitle>
      {feed.messages.length === 0 ? (
        <div className="flex items-start gap-3 text-sm text-muted">
          <MessageCircle className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
          <p><strong className="font-semibold text-ink">No messages yet.</strong> Once your agent joins a round it reports here in plain words: what it bought, at what price, and when the goods are due.</p>
        </div>
      ) : (
        <ol aria-label="Latest messages from your agent" className="flex flex-col gap-2.5">
          {feed.messages.map((m) => <Bubble key={m.id} message={m} showSender={false} />)}
        </ol>
      )}
      <NextRoundLine />
    </Panel>
  );
}
