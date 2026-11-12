import { Fragment } from "react";
import { Bubble } from "@/components/chat/bubble";
import { dayKey, formatDay } from "@/lib/format";
import type { ChatMessage } from "@/lib/wa";

export function Thread({ messages, showSender }: { messages: ChatMessage[]; showSender: boolean }) {
  return (
    <ol className="flex flex-col gap-2" aria-label="Messages">
      {messages.map((m, i) => {
        const previous = messages[i - 1];
        const separator = previous === undefined || dayKey(previous.t) !== dayKey(m.t);
        return (
          <Fragment key={m.id}>
            {separator && (
              <li className="my-1 flex justify-center">
                <span className="rounded-md bg-paper-deep px-2.5 py-0.5 text-xs font-semibold text-ink-soft shadow-[0_1px_0_rgba(42,33,24,0.25)]">
                  {formatDay(m.t)}
                </span>
              </li>
            )}
            <Bubble message={m} showSender={showSender} />
          </Fragment>
        );
      })}
    </ol>
  );
}
