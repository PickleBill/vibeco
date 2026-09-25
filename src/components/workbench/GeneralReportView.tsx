import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Check,
  Copy,
  Download,
  Share2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import type { GeneralReport } from "../../../supabase/functions/_shared/workbench-types";
import { copyToClipboard } from "@/lib/copyToClipboard";
import { downloadText, reportMarkdown, setSharing } from "@/lib/workbench";
import { jsPDF } from "jspdf";

export default function GeneralReportView({
  report,
  example = false,
  reportId,
  initialSharing = false,
  readOnly = false,
  onRefine,
  onSave,
  saved = false,
}: {
  report: GeneralReport;
  example?: boolean;
  reportId?: string;
  initialSharing?: boolean;
  readOnly?: boolean;
  onRefine?: (instruction: string) => void;
  onSave?: () => void;
  saved?: boolean;
}) {
  const [instruction, setInstruction] = useState("");
  const [shared, setShared] = useState(initialSharing);
  const [sharing, setSharingBusy] = useState(false);
  const [kept, setKept] = useState<string[]>([]);
  const copy = async (text: string) => {
    if (await copyToClipboard(text)) toast.success("Copied.");
    else toast.error("Could not copy. Download the report instead.");
  };
  const pdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(
      reportMarkdown(report).replace(/#/g, ""),
      175,
    );
    let y = 18;
    for (const line of lines) {
      if (y > 278) {
        doc.addPage();
        y = 18;
      }
      doc.text(line, 18, y);
      y += 5;
    }
    doc.save("vibeco-report.pdf");
  };
  const share = async (enabled: boolean) => {
    if (!reportId) return;
    setSharingBusy(true);
    try {
      await setSharing(reportId, enabled);
      setShared(enabled);
      if (enabled) await copy(`${location.origin}/report/${reportId}`);
      toast.success(
        enabled
          ? "Sharing enabled. Anyone with this link can read this report."
          : "Link revoked. This report is private.",
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSharingBusy(false);
    }
  };
  const keep = (text: string) =>
    setKept((items) =>
      items.includes(text) ? items.filter((x) => x !== text) : [...items, text],
    );
  return (
    <article className="work-report" aria-label="Analysis report">
      <header className="work-report-header">
        <p className="work-eyebrow">
          {example
            ? "Worked example · illustrative, not a live run"
            : readOnly
              ? "Shared report"
              : "Your working report"}
        </p>
        <h1>{report.title}</h1>
        <p className="work-question">{report.question}</p>
        <div className="work-toolbar">
          {onSave && (
            <button className="work-button" onClick={onSave}>
              {saved ? <Check size={16} /> : <ShieldCheck size={16} />}{" "}
              {saved ? "Saved privately" : "Save privately"}
            </button>
          )}
          <button
            className="work-button secondary"
            onClick={() =>
              downloadText(reportMarkdown(report), "vibeco-report.md")
            }
          >
            <Download size={16} /> Markdown
          </button>
          <button className="work-button secondary" onClick={pdf}>
            <Download size={16} /> PDF
          </button>
          <button
            className="work-button secondary"
            onClick={() => copy(reportMarkdown(report))}
          >
            <Copy size={16} /> Copy report
          </button>
          {reportId && !readOnly && (
            <button
              className="work-button secondary"
              disabled={sharing}
              onClick={() => share(!shared)}
            >
              <Share2 size={16} />
              {shared ? "Revoke share link" : "Enable sharing & copy link"}
            </button>
          )}
        </div>
        {shared && !readOnly && (
          <p className="work-note">
            Anyone with your share link can read this report. Revoke it here at
            any time.
          </p>
        )}
      </header>
      <nav className="report-toc" aria-label="Report sections">
        <a href="#recommendation">Recommendation</a>
        <a href="#perspectives">Perspectives</a>
        <a href="#evidence">Evidence</a>
        <a href="#next-actions">Next actions</a>
        <a href="#handoff">Put it to work</a>
      </nav>
      <section id="recommendation" className="report-recommendation">
        <span className="work-eyebrow">A useful next move</span>
        <h2>{report.recommendation}</h2>
        <p>{report.summary}</p>
      </section>
      <div className="report-split">
        <section>
          <h2>The tradeoffs</h2>
          <ul>
            {report.tensions.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </section>
        <section>
          <h2>What we still need to know</h2>
          <ul>
            {report.openQuestions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </section>
      </div>
      <section id="perspectives">
        <div className="report-section-heading">
          <h2>Explore the perspectives</h2>
          <span>Simulated lenses, not independent experts</span>
        </div>
        {report.perspectives.map((p, i) => (
          <details className="perspective-row" key={p.name} open={i === 0}>
            <summary>
              <span className="perspective-index">0{i + 1}</span>
              <strong>{p.name}</strong>
              <span>{p.position}</span>
            </summary>
            <div className="perspective-body">
              <p>{p.rationale}</p>
              {!readOnly && (
                <button
                  className="work-text-button"
                  onClick={() => keep(p.position)}
                >
                  {kept.includes(p.position)
                    ? "✓ Kept for this session"
                    : "Keep this insight"}
                </button>
              )}
            </div>
          </details>
        ))}
      </section>
      <section id="evidence">
        <h2>Evidence & assumptions</h2>
        <p className="work-note">
          Sources support specific facts. Agreement between generated
          perspectives does not verify a claim.
        </p>
        <div className="report-split">
          <div>
            <h3>Facts and supplied context</h3>
            <ul>
              {report.facts.map((f, i) => (
                <li key={i}>
                  {f.text}
                  <small>
                    {f.sourceIds.length
                      ? f.sourceIds.map((id) => {
                          const s = report.sources.find((x) => x.id === id);
                          return s ? (
                            <a
                              key={id}
                              href={s.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {s.title} ↗
                            </a>
                          ) : null;
                        })
                      : "Supplied context · not independently verified"}
                  </small>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Working assumptions</h3>
            <ul>
              {report.assumptions.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
        </div>
        {report.sources.length > 0 && (
          <details className="report-detail">
            <summary>
              View {report.sources.length} source
              {report.sources.length === 1 ? "" : "s"}
            </summary>
            <ol>
              {report.sources.map((s) => (
                <li key={s.id}>
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {s.title}
                    <ArrowUpRight size={14} />
                  </a>
                  <small>
                    Retrieved {new Date(s.retrievedAt).toLocaleString()}
                  </small>
                  <p>{s.excerpt}</p>
                </li>
              ))}
            </ol>
          </details>
        )}
        <details className="report-detail">
          <summary>Other paths worth considering</summary>
          <ul>
            {report.alternatives.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </details>
        <details className="report-detail">
          <summary>Limits of this analysis</summary>
          <ul>
            {report.limitations.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </details>
      </section>
      <section id="next-actions">
        <h2>Make the next move small enough to take</h2>
        <ol className="next-actions">
          {report.nextActions.map((a, i) => (
            <li key={i}>
              <span>0{i + 1}</span>
              <p>{a}</p>
            </li>
          ))}
        </ol>
      </section>
      {kept.length > 0 && (
        <aside className="kept-insights">
          <h3>Insights kept in this session</h3>
          <ul>
            {kept.map((k) => (
              <li key={k}>{k}</li>
            ))}
          </ul>
          <button
            className="work-text-button"
            onClick={() => copy(kept.join("\n"))}
          >
            Copy kept insights
          </button>
        </aside>
      )}
      <section id="handoff">
        <div className="report-section-heading">
          <h2>Put it to work</h2>
          <button
            className="work-text-button"
            onClick={() => copy(report.handoffPrompt)}
          >
            <Copy size={14} /> Copy prompt
          </button>
        </div>
        <details className="report-detail">
          <summary>Your next-step prompt</summary>
          <pre className="handoff-prompt">{report.handoffPrompt}</pre>
        </details>
        {onRefine && (
          <form
            className="refine-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (instruction.trim())
                onRefine(
                  [
                    instruction,
                    ...kept.map((k) => `Keep this insight: ${k}`),
                  ].join("\n"),
                );
            }}
          >
            <label htmlFor="report-refinement">
              What would you challenge, change, or explore further?
            </label>
            <textarea
              id="report-refinement"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              maxLength={4000}
              placeholder="For example: challenge the recommendation, focus on the customer, or make the next step smaller."
            />
            <button className="work-button" disabled={!instruction.trim()}>
              Refine this analysis <ArrowUpRight size={16} />
            </button>
          </form>
        )}
        {example && (
          <p className="work-note">
            This is a prepared example to show the process.{" "}
            <Link
              to={`/simulate?purpose=${report.purpose}&question=${encodeURIComponent(report.question)}`}
            >
              Start with this question →
            </Link>
          </p>
        )}
      </section>
    </article>
  );
}
