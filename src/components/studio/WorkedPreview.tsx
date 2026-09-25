import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, CornerDownRight } from "lucide-react";

const perspectives = [
  { name: "Customer", text: "I want to remember what to practice. Another dashboard might become another chore.", implication: "Fit into the follow-up a coach already sends." },
  { name: "Skeptic", text: "Will coaches use this after the novelty wears off? A positive reaction is not repeat use.", implication: "Test the habit before investing in a platform." },
  { name: "Builder", text: "A note, a short practice plan, and an easy review step could be enough for a first test.", implication: "Keep the coach in control of what gets sent." },
];

export default function WorkedPreview() {
  const [selected, setSelected] = useState(0);
  return (
    <aside className="studio-worked-preview" aria-label="Interactive worked example">
      <div className="studio-preview-caption"><span className="studio-live-dot" aria-hidden="true" /> A question, worked through <span>01 / BUILD</span></div>
      <div className="studio-preview-paper">
        <div className="studio-preview-note">Illustrative example · no AI run</div>
        <p className="studio-eyebrow">The starting question</p>
        <h2>“How could coaches help more between sessions?”</h2>
        <div className="studio-preview-connector" aria-hidden="true"><CornerDownRight size={22} /><span>Try a different perspective</span></div>
        <div className="studio-perspective-tabs" aria-label="Illustrative perspectives">
          {perspectives.map((perspective, index) => <button type="button" key={perspective.name} aria-pressed={selected === index} onClick={() => setSelected(index)}>{perspective.name}</button>)}
        </div>
        <div className="studio-perspective-content" aria-live="polite">
          <p>{perspectives[selected].text}</p>
          <span>{perspectives[selected].implication}</span>
        </div>
        <p className="studio-preview-disclaimer">Synthetic perspectives, not customer interviews.</p>
        <div className="studio-preview-decision">
          <div className="studio-decision-icon"><Check size={18} /></div>
          <div><p className="studio-eyebrow">A useful next move</p><h3>Test the follow-up. Then build the tool.</h3><p>Try a coach-reviewed practice plan with a small pilot. Look for repeat use before adding features.</p></div>
        </div>
        <Link className="studio-text-link" to="/simulate?example=build">Open the worked report <ArrowRight size={16} /></Link>
      </div>
      <p className="studio-preview-footnote">The output is a starting point for judgment.</p>
    </aside>
  );
}
