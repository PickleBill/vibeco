import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function StudioFooter() {
  return (
    <footer className="studio-footer">
      <div className="studio-container studio-footer-top">
        <div><Link to="/" className="studio-logo">VibeCo<span aria-hidden="true">✳</span></Link><p>A working lab for better questions.</p></div>
        <nav aria-label="Footer navigation"><Link to="/simulate">Open the workbench</Link><Link to="/examples">Explore the examples</Link><a href="https://picklebill.github.io/Brick/" target="_blank" rel="noreferrer">Bill's experience <ArrowUpRight size={15} /></a></nav>
      </div>
      <div className="studio-container studio-footer-bottom"><span>Built by Bill Bricker · {new Date().getFullYear()}</span><span>AI helps explore. You make the call.</span></div>
    </footer>
  );
}
