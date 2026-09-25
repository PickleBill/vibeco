import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowUpRight, Copy, GitBranch, Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { copyToClipboard } from "@/lib/copyToClipboard";
import { parsePurpose, purposes, setSharing } from "@/lib/workbench";
import { isLocalPreview } from "@/lib/localPreview";
import "@/styles/workbench.css";

type SavedReport = Tables<"idea_reports">;
export default function MySimulations() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    (async () => {
      if (isLocalPreview) {
        setLoading(false);
        return;
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session || session.user.is_anonymous) {
        navigate("/auth?returnTo=%2Fmy-simulations", { replace: true });
        return;
      }
      const { data, error } = await supabase
        .from("idea_reports")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (!active) return;
      if (error)
        setError(
          "Your saved work could not be loaded. Please retry; no reports were changed.",
        );
      else setReports(data || []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [navigate]);
  const share = async (r: SavedReport) => {
    setBusy(r.id);
    try {
      await setSharing(r.id, !r.sharing_enabled);
      setReports((prev) =>
        prev.map((x) =>
          x.id === r.id ? { ...x, sharing_enabled: !r.sharing_enabled } : x,
        ),
      );
      if (!r.sharing_enabled) {
        const copied = await copyToClipboard(
          `${location.origin}/report/${r.id}`,
        );
        toast(
          copied
            ? "Sharing enabled and link copied."
            : "Sharing enabled. Open the report to copy its URL.",
        );
      } else toast.success("Share link revoked.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  return (
    <>
      <Navbar />
      <main id="main-content" className="workbench-page">
        <div className="workbench-shell">
          <div className="workbench-topline">
            <div>
              <p className="work-eyebrow">Your private workspace</p>
              <h1 className="font-display text-4xl">
                Keep your thinking moving.
              </h1>
            </div>
            <Link className="work-button" to="/simulate">
              <Plus size={16} /> New question
            </Link>
          </div>
          <p className="work-intro">
            Research, decisions, and build ideas. Private unless you explicitly
            enable a share link.
          </p>
          {isLocalPreview && (
            <div className="preview-notice">
              Local preview has no connected account or saved cloud records.{" "}
              <Link to="/examples">Explore examples →</Link>
            </div>
          )}
          {error && (
            <p role="alert" className="work-error">
              {error}
            </p>
          )}
          {loading && <p role="status">Loading your work…</p>}
          {!loading && !error && !reports.length && (
            <section className="report-recommendation">
              <h2 className="text-2xl mb-4">
                Your next useful question starts here.
              </h2>
              <p>
                Run an analysis, then save it to return to the evidence, refine
                the thinking, and put it to work.
              </p>
              <Link className="work-text-button" to="/simulate">
                Open the workbench <ArrowUpRight size={16} />
              </Link>
            </section>
          )}
          <div className="saved-work-list">
            {reports.map((r) => (
              <article key={r.id} className="border-t border-border py-7">
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-3">
                  <span>
                    {
                      purposes.find((p) => p.id === parsePurpose(r.purpose))
                        ?.label
                    }
                  </span>
                  <span>{new Date(r.created_at).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1">
                    <ShieldCheck size={13} />
                    {r.sharing_enabled ? "Link sharing enabled" : "Private"}
                  </span>
                </div>
                <Link
                  to={`/simulate?id=${r.id}`}
                  className="font-display text-xl font-bold hover:text-primary"
                >
                  {r.title || r.idea.slice(0, 100)}
                </Link>
                <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
                  {r.idea}
                </p>
                <div className="work-toolbar mt-4">
                  <Link className="work-button" to={`/simulate?id=${r.id}`}>
                    Continue <ArrowUpRight size={15} />
                  </Link>
                  {r.lovable_prompt && (
                    <button
                      className="work-button secondary"
                      onClick={async () =>
                        toast(
                          (await copyToClipboard(r.lovable_prompt!))
                            ? "Prompt copied."
                            : "Copy failed. Open the report to download it.",
                        )
                      }
                    >
                      <Copy size={14} /> Copy prompt
                    </button>
                  )}
                  <Link
                    className="work-button secondary"
                    to={`/simulate?purpose=${parsePurpose(r.purpose)}&question=${encodeURIComponent(r.idea)}`}
                    state={{ forkedFrom: r.id }}
                  >
                    <GitBranch size={14} /> Start a new version
                  </Link>
                  <button
                    className="work-button secondary"
                    disabled={busy === r.id}
                    onClick={() => share(r)}
                  >
                    {r.sharing_enabled
                      ? "Revoke share link"
                      : "Enable sharing & copy link"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
