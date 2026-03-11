import { HelmetProvider, Helmet } from "react-helmet-async";
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
    <SimulatorShell />
  </HelmetProvider>
);

export default Simulate;
