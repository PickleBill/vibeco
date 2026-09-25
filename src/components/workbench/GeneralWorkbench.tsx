import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type {
  GeneralReport,
  GeneralPurpose,
} from "../../../supabase/functions/_shared/workbench-types";
import { parseGeneralReport } from "../../../supabase/functions/_shared/workbench-types";
import type { Json } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { invokeWorkbench } from "@/lib/workbench";
import { isLocalPreview } from "@/lib/localPreview";
import GeneralReportView from "./GeneralReportView";

const DRAFT = "vibeco_general_draft";
export default function GeneralWorkbench({
  purpose,
  initialQuestion = "",
  initialSources,
  resumeId,
  example,
  onQuestionChange,
}: {
  purpose: GeneralPurpose;
  initialQuestion?: string;
  initialSources?: string[];
  resumeId?: string;
  example?: GeneralReport;
  onQuestionChange?: (question: string) => void;
}) {
  const navigate = useNavigate();
  const [question, setQuestion] = useState(initialQuestion);
  const [context, setContext] = useState("");
  const [urls, setUrls] = useState((initialSources || []).join("\n"));
  const [report, setReport] = useState<GeneralReport | null>(example || null);
  const [reportId, setReportId] = useState<string | undefined>(resumeId);
  const [sharing, setSharing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const abort = useRef<AbortController | null>(null);
  useEffect(() => {
    if (example) {
      onQuestionChange?.(example.question);
      return;
    }
    let active = true;
    if (resumeId) {
      setLoading(true);
      Promise.resolve(
        supabase.from("idea_reports").select("*").eq("id", resumeId).single(),
      )
        .then(({ data, error }) => {
          if (!active) return;
          if (error || !data) {
            setError(
              "This private report could not be opened. Sign in with the account that saved it.",
            );
            return;
          }
          try {
            const row = data as typeof data & {
              general_report: unknown;
              sharing_enabled: boolean;
            };
            const r = parseGeneralReport(row.general_report);
            setReport(r);
            setQuestion(r.question);
            onQuestionChange?.(r.question);
            setSharing(row.sharing_enabled);
            setSaved(true);
          } catch {
            setError(
              "This report has an unsupported format. Its stored content has not been changed.",
            );
          }
        })
        .catch(() => {
          if (active)
            setError("Could not open your saved report. Please retry.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    } else if (initialQuestion) {
      setQuestion(initialQuestion);
      onQuestionChange?.(initialQuestion);
    } else if (!initialQuestion) {
      try {
        const d = JSON.parse(localStorage.getItem(DRAFT) || "null");
        if (d?.purpose === purpose) {
          setQuestion(d.question || "");
          onQuestionChange?.(d.question || "");
          setContext(d.context || "");
          setUrls(d.urls || "");
          if (d.report) setReport(parseGeneralReport(d.report));
        }
      } catch {
        /* invalid draft is ignored */
      }
    }
    return () => {
      active = false;
      abort.current?.abort();
    };
  }, [resumeId, example, purpose, initialQuestion, onQuestionChange]);
  useEffect(() => {
    if (example || resumeId) return;
    try {
      localStorage.setItem(
        DRAFT,
        JSON.stringify({ purpose, question, context, urls, report }),
      );
    } catch {
      /* visible report can still be exported */
    }
  }, [purpose, question, context, urls, report, example, resumeId]);
  const run = async (refinement?: string) => {
    if (loading) return;
    setError("");
    setLoading(true);
    const controller = new AbortController();
    abort.current = controller;
    try {
      const result = await invokeWorkbench(
        {
          action: refinement ? "refine" : "analyze",
          purpose,
          question,
          context,
          sourceUrls: urls
            .split("\n")
            .map((x) => x.trim())
            .filter(Boolean),
          ...(refinement ? { priorReport: report, refinement } : {}),
        },
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setReport(parseGeneralReport(result.report));
      setSaved(false);
    } catch (e) {
      if (!controller.signal.aborted)
        setError(
          (e as Error).message ||
            "Analysis did not finish. Your question and previous report are preserved.",
        );
    } finally {
      if (abort.current === controller) {
        setLoading(false);
        abort.current = null;
      }
    }
  };
  const save = async () => {
    if (!report || saving) return;
    if (isLocalPreview) {
      toast("This example is local. Download it as Markdown or PDF.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session || session.user.is_anonymous) {
        toast("Create an account to save. Your draft stays in this browser.");
        navigate(
          `/auth?returnTo=${encodeURIComponent("/simulate?purpose=" + purpose)}`,
        );
        return;
      }
      const payload = {
        user_id: session.user.id,
        idea: report.question,
        title: report.title,
        purpose,
        schema_version: 2,
        general_report: report as unknown as Json,
        brief: {},
        status: "brief-complete",
        lovable_prompt: report.handoffPrompt,
      };
      const table = supabase.from("idea_reports");
      const result = reportId
        ? await table.update(payload).eq("id", reportId).select("id").single()
        : await table.insert(payload).select("id").single();
      if (result.error || !result.data)
        throw new Error(
          "The report was not saved. Your working copy is still here; retry or download it.",
        );
      setReportId(result.data.id);
      setSaved(true);
      toast.success("Saved to your private workspace.");
      if (!reportId)
        navigate(`/simulate?id=${result.data.id}`, { replace: true });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="general-workbench">
      {!report && (
        <form
          className="question-form"
          onSubmit={(e) => {
            e.preventDefault();
            run();
          }}
        >
          <p className="work-eyebrow">Frame the question</p>
          <h1>What do you want to think through?</h1>
          <p className="work-intro">
            Start where you are. Bring the context you have. We’ll explore the
            perspectives, make assumptions visible, and shape a useful next
            step.
          </p>
          <label htmlFor="work-question">Your question</label>
          <textarea
            id="work-question"
            value={question}
            onChange={(e) => {
              setQuestion(e.target.value);
              onQuestionChange?.(e.target.value);
            }}
            required
            minLength={10}
            maxLength={8000}
            placeholder={
              purpose === "research"
                ? "Which company or topic are you researching, and what do you need to understand?"
                : purpose === "initiative"
                  ? "What initiative are you considering, and what would success look like?"
                  : "What decision are you facing? Describe the options and what matters."
            }
          />
          <details className="context-details">
            <summary>
              Add context or sources <span>optional</span>
            </summary>
            <label htmlFor="work-context">What should we know?</label>
            <textarea
              id="work-context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              maxLength={12000}
              placeholder="Your desired outcome, stakeholders, constraints, and facts you already know."
            />
            <label htmlFor="work-sources">
              Public source URLs · one per line, up to five
            </label>
            <textarea
              id="work-sources"
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              placeholder="https://company.com/about"
            />
            <p className="work-note">
              When available, public sources will be collected and cited. Your
              context is labeled as supplied information.
            </p>
          </details>
          <div className="question-submit">
            <button
              className="work-button"
              disabled={loading || question.trim().length < 10}
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <ArrowUpRight size={18} />
              )}{" "}
              Think it through
            </button>
            <span>Limited guest trial · account to save</span>
          </div>
        </form>
      )}
      {error && (
        <div className="work-error" role="alert">
          <strong>Something needs your attention</strong>
          <p>{error}</p>
        </div>
      )}
      {loading && (
        <div className="work-progress" role="status">
          <Loader2 className="animate-spin" size={20} />
          <span>
            {resumeId && !report
              ? "Opening your private report…"
              : "Exploring perspectives and preparing your report. This may take a minute."}
          </span>
          <button
            className="work-text-button"
            onClick={() => {
              abort.current?.abort();
              abort.current = null;
              setLoading(false);
            }}
          >
            Stop waiting
          </button>
        </div>
      )}
      {report && (
        <GeneralReportView
          key={reportId || "working"}
          report={report}
          example={!!example}
          reportId={reportId}
          initialSharing={sharing}
          saved={saved}
          onSave={example ? undefined : save}
          onRefine={example || loading ? undefined : run}
        />
      )}
      {saving && (
        <p role="status" className="work-note">
          Saving your private report…
        </p>
      )}
    </div>
  );
}
