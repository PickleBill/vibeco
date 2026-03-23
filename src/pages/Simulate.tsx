import { HelmetProvider, Helmet } from "react-helmet-async";
import { Lock } from "lucide-react";
import Navbar from "@/components/Navbar";
import SimulatorShell from "@/components/simulator/SimulatorShell";

const Simulate = () => (
  <HelmetProvider>
    <Helmet>
      <title>AI Idea Simulator | VibeCo</title>
      <meta
        name="description"
        content="Describe your wildest idea and get an instant AI-generated business brief with industry analysis, features, and investor perspectives."
      />
    </Helmet>
    <Navbar />
    <div className="flex justify-end max-w-4xl mx-auto px-6 pt-4">
      <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground/50 border border-border/30 rounded-full px-3 py-1">
        <Lock size={10} />
        PDF report — unlocks at completion
      </div>
    </div>
    <SimulatorShell />
  </HelmetProvider>
);

export default Simulate;
