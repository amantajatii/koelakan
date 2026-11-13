import { Fragment } from "react";
import { Bubble } from "@/components/chat/bubble";
import { dayKey, formatDay } from "@/lib/format";
import type { ChatMessage } from "@/lib/wa";

export function Thread({ messages, showSender }: { messages: ChatMessage[]; showSender: boolean }) {
  return (
    <ol className="flex flex-col gap-2.5">
      {messages.map((m, i) => {
        const previous = messages[i - 1];
        const separator = previous === undefined || dayKey(previous.t) !== dayKey(m.t);
        return (
          <Fragment key={m.id}>
            {separator && (
              <li className="my-1.5 flex justify-center">
                <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted shadow-card">{formatDay(m.t)}</span>
              </li>
            )}
            <Bubble message={m} showSender={showSender} />
          </Fragment>
        );
      })}
    </ol>
  );
}
