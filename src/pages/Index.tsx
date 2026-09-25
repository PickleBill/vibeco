import { useRef, useState, type FormEvent } from "react";
import { Helmet, HelmetProvider } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { ArrowDown, ArrowRight, ArrowUpRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import StudioFooter from "@/components/studio/StudioFooter";
import WorkedPreview from "@/components/studio/WorkedPreview";
import { selectedStories, studioStarters, workbenchUrl, type StudioPurpose } from "@/data/studio";

const steps = [
  ["Frame", "Get the question right."], ["Explore", "See more than one angle."], ["Challenge", "Find the weak assumptions."], ["Decide", "Make the tradeoffs clear."], ["Put it to work", "Leave with a next move."],
];

export default function Index() {
  const [purpose, setPurpose] = useState<StudioPurpose>("build");
  const [question, setQuestion] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!question.trim()) { inputRef.current?.focus(); return; }
    navigate(workbenchUrl(purpose, question.trim()));
  };

  return (
    <HelmetProvider>
      <Helmet>
        <title>VibeCo — Turn a messy question into a clear next move</title>
        <meta name="description" content="Explore an idea, research a company, pressure-test an initiative, or work through a decision. An AI workbench by Bill Bricker." />
        <link rel="canonical" href="https://vibeco.lovable.app/" />
        <meta property="og:title" content="VibeCo — A working lab for better questions" />
        <meta property="og:description" content="Turn a messy question into a clear next move. Explore the workbench and Bill Bricker's product experiments." />
        <meta property="og:url" content="https://vibeco.lovable.app/" />
      </Helmet>
      <div className="studio-site">
        <Navbar />
        <main id="main-content">
          <section className="studio-container studio-hero" aria-labelledby="studio-heading">
            <div className="studio-hero-copy">
              <p className="studio-eyebrow"><span className="studio-kicker-line" /> Bill Bricker's working AI lab</p>
              <h1 id="studio-heading">Turn a messy question into a <span>clear next move.</span></h1>
              <p className="studio-hero-description">Explore an idea, research a company, pressure-test an initiative, or work through a decision.</p>
              <form className="studio-question-form" onSubmit={submit}>
                <fieldset><legend className="studio-form-label">What are you working through?</legend><div className="studio-starter-choices">
                  {studioStarters.map(starter => <label key={starter.purpose} className={`studio-starter${purpose === starter.purpose ? " is-selected" : ""}`}><input type="radio" name="purpose" value={starter.purpose} checked={purpose === starter.purpose} onChange={() => setPurpose(starter.purpose)} /><span>{starter.label}</span></label>)}
                </div></fieldset>
                <div className="studio-input-wrap">
                  <label className="sr-only" htmlFor="studio-question">Your question or idea</label>
                  <textarea id="studio-question" ref={inputRef} value={question} maxLength={8000} rows={3} onChange={event => setQuestion(event.target.value)} placeholder="A rough idea is a perfectly good start…" required />
                  <div className="studio-input-actions"><button type="button" className="studio-try-example" onClick={() => { setQuestion(studioStarters.find(starter => starter.purpose === purpose)!.question); inputRef.current?.focus(); }}>Try a starting question</button><button type="submit" className="studio-button">Let's work it through <ArrowRight size={17} /></button></div>
                </div>
                <p className="studio-form-note">Review your question before running. Or <Link to="/examples">explore a finished example</Link>.</p>
              </form>
            </div>
            <WorkedPreview />
          </section>

          <section className="studio-process" id="model" aria-label="How the workbench works">
            <div className="studio-container"><div className="studio-process-heading"><p className="studio-eyebrow">A little structure. A lot more possibility.</p><a href="#projects" className="studio-text-link">See the work <ArrowDown size={15} /></a></div><ol>{steps.map(([title, description], index) => <li key={title}><span className="studio-step-number">0{index + 1}</span><div><h2>{title}</h2><p>{description}</p></div></li>)}</ol></div>
          </section>

          <section className="studio-container studio-stories" id="projects" aria-labelledby="stories-heading">
            <div className="studio-section-heading"><div><p className="studio-eyebrow">From questions to things you can try</p><h2 id="stories-heading">Different problems.<br />The same curiosity.</h2></div><p>Commercial thinking meets hands-on making. A few explorations from the wider lab.</p></div>
            <div className="studio-story-layout">
              <article className="studio-featured-story">
                <a className="studio-story-image" href={selectedStories[0].project.url} target="_blank" rel="noreferrer" aria-label="Explore Courtana prototype (opens in a new tab)"><img src={selectedStories[0].project.thumbnail} alt="Courtana coaching prototype" loading="lazy" /><span>{selectedStories[0].project.maturity} <ArrowUpRight size={16} /></span></a>
                <div className="studio-story-heading"><span className="studio-story-number">01</span><p>{selectedStories[0].lens}</p></div>
                <h3>{selectedStories[0].title}</h3><p className="studio-story-question">{selectedStories[0].question}</p><p>{selectedStories[0].approach}</p><a className="studio-text-link" href={selectedStories[0].project.url} target="_blank" rel="noreferrer">Explore Courtana <ArrowUpRight size={16} /></a>
              </article>
              <div className="studio-side-stories">{selectedStories.slice(1).map(story => <article key={story.project.name}><div className="studio-story-heading"><span className="studio-story-number">{story.number}</span><p>{story.lens}</p></div><h3>{story.title}</h3><p className="studio-story-question">{story.question}</p><p>{story.approach}</p><div className="studio-story-bottom"><a className="studio-text-link" href={story.project.url} target="_blank" rel="noreferrer">Explore {story.project.name} <ArrowUpRight size={16} /></a><span className="studio-maturity">{story.project.maturity}</span></div></article>)}</div>
            </div>
            <div className="studio-catalog-prompt"><p>There's more in the lab: sports, services, research, and everyday life.</p><Link to="/examples#catalog" className="studio-text-link">Explore all 14 projects <ArrowRight size={17} /></Link></div>
          </section>

          <section className="studio-about-strip" id="contact"><div className="studio-container"><div><p className="studio-eyebrow">The person behind the questions</p><h2>Hi, I'm Bill.<br />I connect opportunity to action.</h2></div><div><p>My work sits at the intersection of strategic partnerships, business development, and building. VibeCo is a place to see that thinking in motion—and put it to work on your own questions.</p><Link to="/about" className="studio-text-link">A little more about me <ArrowRight size={17} /></Link></div></div></section>
        </main>
        <StudioFooter />
      </div>
    </HelmetProvider>
  );
}
