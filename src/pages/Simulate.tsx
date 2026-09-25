import { useCallback, useEffect, useRef, useState } from "react";
import { HelmetProvider, Helmet } from "react-helmet-async";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SimulatorShell from "@/components/simulator/SimulatorShell";
import GeneralWorkbench from "@/components/workbench/GeneralWorkbench";
import { purposes, parsePurpose, type Purpose } from "@/lib/workbench";
import { isLocalPreview } from "@/lib/localPreview";
import { supabase } from "@/integrations/supabase/client";
import { workbenchExamples } from "@/data/workbenchExamples";
import "@/styles/workbench.css";

interface LocationState {
  prefillIdea?: string;
  forkedFrom?: string;
  resumeId?: string;
  purpose?: Purpose;
  sourceUrls?: string[];
}
export default function Simulate() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const state = (location.state || {}) as LocationState;
  const questionRef = useRef(params.get("question") || state.prefillIdea || "");
  const recordQuestion = useCallback((question: string) => {
    questionRef.current = question;
  }, []);
  const resumeId = params.get("id") || state.resumeId;
  const example = params.get("example");
  const purpose = parsePurpose(
    example || params.get("purpose") || state.purpose || null,
  );
  const [loadedPurpose, setLoadedPurpose] = useState<Purpose | null>(null);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    setLoadedPurpose(null);
    setLoadError("");
    if (!resumeId) return;
    let active = true;
    supabase
      .from("idea_reports")
      .select("purpose")
      .eq("id", resumeId)
      .single()
      .then(({ data, error }) => {
        if (!active) return;
        if (error)
          setLoadError(
            "Could not open this private report. Sign in with the account that saved it, then retry.",
          );
        else
          setLoadedPurpose(
            parsePurpose((data as { purpose?: string })?.purpose || "build"),
          );
      });
    return () => {
      active = false;
    };
  }, [resumeId]);
  const selected = loadedPurpose || purpose;
  const changePurpose = (next: Purpose) => {
    const p = new URLSearchParams();
    p.set("purpose", next);
    const q = questionRef.current;
    if (q) p.set("question", q);
    setParams(p);
  };
  return (
    <HelmetProvider>
      <Helmet>
        <title>Workbench · VibeCo</title>
        <meta
          name="description"
          content="Explore an idea, research a company, pressure-test an initiative, or work through a decision. Turn a messy question into a clear next move."
        />
      </Helmet>
      <Navbar />
      <main id="main-content" className="workbench-page">
        <div className="workbench-shell">
          <div className="workbench-topline">
            <p className="work-eyebrow">Your thinking, made useful.</p>
            <Link to="/signal">Find signals ↗</Link>
          </div>
          {isLocalPreview && (
            <div className="preview-notice">
              <span>
                <strong>Local preview.</strong> Live AI and account services are
                disconnected.
              </span>
              <Link to="/examples">Explore examples →</Link>
            </div>
          )}
          {!resumeId && (
            <div
              className="purpose-switch"
              role="group"
              aria-label="What are you working on?"
            >
              {purposes.map((p) => (
                <button
                  key={p.id}
                  aria-pressed={selected === p.id}
                  onClick={() => changePurpose(p.id)}
                  title={p.description}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
          {loadError ? (
            <p role="alert" className="work-error">
              {loadError}
            </p>
          ) : resumeId && !loadedPurpose ? (
            <p role="status">Opening your workspace…</p>
          ) : selected === "build" ? (
            <div className="build-workspace">
              <SimulatorShell
                key={example || resumeId || params.get("question") || "build"}
                resumeId={resumeId || undefined}
                prefillIdea={params.get("question") || state.prefillIdea}
                forkedFrom={state.forkedFrom}
                onQuestionChange={recordQuestion}
                example={example === "build"}
              />
            </div>
          ) : (
            <GeneralWorkbench
              key={selected + ":" + (example || resumeId || "")}
              purpose={selected}
              initialSources={state.sourceUrls}
              onQuestionChange={recordQuestion}
              initialQuestion={
                params.get("question") || state.prefillIdea || ""
              }
              resumeId={resumeId || undefined}
              example={example ? workbenchExamples[selected] : undefined}
            />
          )}
        </div>
      </main>
    </HelmetProvider>
  );
}
