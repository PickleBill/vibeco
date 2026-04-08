import { HelmetProvider, Helmet } from "react-helmet-async";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SimulatorShell from "@/components/simulator/SimulatorShell";

const Simulate = () => {
  const [searchParams] = useSearchParams();
  const resumeId = searchParams.get("id") || undefined;

  return (
    <HelmetProvider>
      <Helmet>
        <title>AI Idea Simulator | VibeCo</title>
        <meta
          name="description"
          content="Describe your wildest idea and get an instant AI-generated business brief with industry analysis, features, and investor perspectives."
        />
      </Helmet>
      <Navbar />
      <SimulatorShell resumeId={resumeId} />
    </HelmetProvider>
  );
};

export default Simulate;
