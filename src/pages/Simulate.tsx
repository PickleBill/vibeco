import { HelmetProvider, Helmet } from "react-helmet-async";
import { useSearchParams, useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SimulatorShell from "@/components/simulator/SimulatorShell";
import { isLens } from "@/lib/lenses";

interface LocationState {
  prefillIdea?: string;
  forkedFrom?: string;
  resumeId?: string;
}

const Simulate = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const state = (location.state || {}) as LocationState;
  const resumeId = searchParams.get("id") || state.resumeId || undefined;
  const lensParam = searchParams.get("lens");
  const initialLens = isLens(lensParam) ? lensParam : undefined;
  const draftIdea = searchParams.get("q")?.slice(0, 2000) || undefined;

  return (
    <HelmetProvider>
      <Helmet>
        <title>Simulate | VibeCo</title>
        <meta
          name="description"
          content="Work through an idea, a company, an initiative, or a decision. Frame it, explore it, challenge it, and leave with a clear next move."
        />
      </Helmet>
      <Navbar />
      <SimulatorShell
        resumeId={resumeId}
        prefillIdea={state.prefillIdea}
        forkedFrom={state.forkedFrom}
        draftIdea={draftIdea}
        initialLens={initialLens}
      />
    </HelmetProvider>
  );
};

export default Simulate;
