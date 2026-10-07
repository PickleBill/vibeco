import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/copyToClipboard";
import { cx, secondaryButton } from "../style";
import { dayLabel } from "./evidence";
import { digestText, type RadarAccount } from "./model";

/**
 * What a morning email to the seller would say: the top three moves, each as
 * account · trigger · the question to ask. A preview to copy; nothing is sent.
 */
export function Digest({ accounts, territory, subject }: { accounts: RadarAccount[]; territory: string; subject: string }) {
  const [copied, setCopied] = useState(false);
  const top = accounts.slice(0, 3);
  if (!top.length) return null;

  const copy = async () => {
    const ok = await copyToClipboard(digestText(territory, subject, top));
    if (ok) {
      setCopied(true);
      toast.success("Digest copied");
      window.setTimeout(() => setCopied(false), 2000);
    } else toast.error("Couldn't copy. Select the text instead.");
  };

  return (
    <section aria-labelledby="digest-title" className="mt-8 border-t border-[#ECE8DE] pt-6">
      <div className="mb-3.5 flex flex-wrap items-center gap-x-3.5 gap-y-2.5">
        <h2 id="digest-title" className="font-display text-[22px] font-semibold tracking-[-0.01em]">
          Morning digest · preview
        </h2>
        <span className="inline-flex min-h-[26px] items-center rounded-md border border-dashed border-foreground px-2.5 text-xs font-bold">
          Internal · for the seller only · never sent to prospects
        </span>
      </div>
      <div className="max-w-[780px] overflow-hidden rounded-xl border border-border bg-white">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-muted px-4 py-3">
          <div className="flex min-w-0 flex-col gap-0.5 font-mono text-[13px] text-[#4A4F63]">
            <span>From: VibeCo radar · To: you (seller)</span>
            <span className="mt-1 font-display text-[17px] font-semibold text-foreground">{subject}</span>
          </div>
          <button type="button" onClick={copy} className={cx(secondaryButton, "min-h-10 px-3 text-sm")}>
            {copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <ol className="flex flex-col gap-3 px-4 py-3.5">
          {top.map((a, i) => (
            <li key={a.row.id} className="flex items-start gap-3">
              <span className="min-w-[18px] font-mono text-[13px] font-semibold text-primary">{i + 1}</span>
              <div className="min-w-0">
                <div className="font-bold">
                  {a.row.name}{" "}
                  <span className="font-normal text-[#4A4F63]">
                    · {a.changes.length ? "changed since the last run" : a.trigger ? `${a.trigger.text} (${dayLabel(a.trigger.date)})` : "no dated trigger found"}
                  </span>
                </div>
                {a.question && <div className="text-[15px] text-[#4A4F63]">Ask: &ldquo;{a.question}&rdquo;</div>}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
