import { HelmetProvider, Helmet } from "react-helmet-async";
import { useParams } from "react-router-dom";

/**
 * /deal/:id: the prospect-facing brief ("here's what we think we know about
 * you, from public sources; correct us"). Shows claims and sources only: never
 * the fit grade, critics, objections or anything else internal. (Placeholder.)
 */
const DealRoom = () => {
  const { id } = useParams<{ id: string }>();
  return (
    <HelmetProvider>
      <Helmet>
        <title>Correct the brief | VibeCo</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <main className="mx-auto max-w-3xl px-4 py-16">
        <p className="text-sm text-muted-foreground">Unofficial. Built from public sources. Not affiliated with Omni.</p>
        <h1 className="mt-4 font-display text-3xl font-bold">Brief {id?.slice(0, 8)}</h1>
      </main>
    </HelmetProvider>
  );
};

export default DealRoom;
