import { useCallback, useEffect, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CircleHelp } from "lucide-react";
import type { SellerConfig } from "@/lib/sellers";
import { moduleHref } from "../nav";
import { closeWelcome, markWelcomeSeen, openWelcome, setStep, useTourState, welcomeSeen } from "./store";
import { tourSteps } from "./steps";
import { TourButton, TourCard } from "./TourPopover";
import { WelcomeDialog } from "./WelcomeDialog";

/** Drop one-shot URL flags (?tour, ?welcome) once they've been read. */
function without(search: string, ...keys: string[]) {
  const p = new URLSearchParams(search);
  keys.forEach((k) => p.delete(k));
  const s = p.toString();
  return s ? `?${s}` : "";
}

/**
 * The welcome card and the guided tour for the command center. The card opens
 * on a first visit (any view), and again from "How it works"; ?welcome forces
 * it, ?tour starts the tour (the link to send someone), and ?demo (the
 * presenter bar) keeps both out of the way. The tour walks the views on the
 * territory's first account, one highlighted element per step.
 */
export function TourHost({ seller }: { seller: SellerConfig }) {
  const { welcome, step } = useTourState();
  const { pathname, search } = useLocation();
  const params = useParams<{ module?: string; reportId?: string }>();
  const navigate = useNavigate();
  const steps = useMemo(() => tourSteps(seller.name), [seller.name]);
  const demoId = seller.territory?.accounts[0]?.reportId;

  const hrefFor = useCallback((i: number) => moduleHref(seller.id, steps[i].module, steps[i].withAccount ? demoId : undefined), [seller.id, steps, demoId]);

  /** Show step i, opening its view unless we're already on it (with an account when it needs one). */
  const go = useCallback(
    (i: number, replace = false) => {
      setStep(i);
      const s = steps[i];
      if (!s) return;
      const here = (params.module ?? "radar") === s.module && (!s.withAccount || !!params.reportId);
      if (!here) navigate(hrefFor(i), { replace });
      else if (replace) navigate({ pathname, search: without(search, "tour", "welcome") }, { replace: true });
    },
    [steps, params.module, params.reportId, navigate, hrefFor, pathname, search],
  );

  useEffect(() => {
    const q = new URLSearchParams(search);
    if (q.has("demo")) {
      // A presenter is driving: no card for the rest of this page load.
      markWelcomeSeen(seller.id, false);
      return;
    }
    if (q.has("tour")) {
      markWelcomeSeen(seller.id);
      go(0, true);
    } else if (q.has("welcome")) {
      openWelcome();
      navigate({ pathname, search: without(search, "welcome") }, { replace: true });
    } else if (!welcomeSeen(seller.id)) {
      markWelcomeSeen(seller.id, false);
      openWelcome();
    }
    // Only the URL decides; `go` changes with it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, seller.id]);

  const end = useCallback(() => setStep(null), []);
  const dismiss = () => {
    markWelcomeSeen(seller.id);
    closeWelcome();
  };

  const finish = step !== null && step >= steps.length;
  const s = step !== null ? steps[step] : undefined;

  return (
    <>
      <WelcomeDialog
        open={welcome}
        sellerName={seller.name}
        onClose={dismiss}
        onTour={() => {
          markWelcomeSeen(seller.id);
          go(0);
        }}
      />
      {s && step !== null && (
        <TourCard
          stepKey={`step-${step}`}
          target={s.target}
          count={`${step + 1} of ${steps.length}`}
          title={s.title}
          body={s.body}
          onEnd={end}
          actions={
            <>
              <span className="mr-auto">
                <TourButton kind="quiet" onClick={end}>
                  End
                </TourButton>
              </span>
              {step > 0 && (
                <TourButton kind="secondary" onClick={() => go(step - 1)}>
                  <ArrowLeft size={16} aria-hidden /> Back
                </TourButton>
              )}
              <TourButton kind="primary" onClick={() => go(step + 1)}>
                Next <ArrowRight size={16} aria-hidden />
              </TourButton>
            </>
          }
        />
      )}
      {finish && (
        <TourCard
          stepKey="finish"
          count="That’s the tour"
          title="Now try your own account"
          body="Type any company. In about a minute you get its sources, a first-call plan, seven agents and a verdict."
          onEnd={end}
          actions={
            <>
              <TourButton kind="secondary" onClick={() => go(steps.length - 1)}>
                <ArrowLeft size={16} aria-hidden /> Back
              </TourButton>
              <TourButton
                kind="primary"
                onClick={() => {
                  end();
                  navigate(moduleHref(seller.id, "account"));
                }}
              >
                Run an account <ArrowRight size={16} aria-hidden />
              </TourButton>
            </>
          }
        />
      )}
    </>
  );
}

/** Top-bar button that reopens the welcome card: icon and text on desktop, icon only on phones. */
export function HowItWorksButton() {
  return (
    <button
      type="button"
      onClick={openWelcome}
      aria-label="How it works"
      className="ml-auto inline-flex h-11 w-11 shrink-0 items-center justify-center gap-1.5 self-center rounded-full border border-[#D9D4C7] bg-white text-sm font-semibold text-foreground hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-8 sm:w-auto sm:px-3"
    >
      <CircleHelp size={16} aria-hidden />
      <span className="hidden sm:inline">How it works</span>
    </button>
  );
}
