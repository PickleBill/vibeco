import { HelmetProvider, Helmet } from "react-helmet-async";
import { Navigate, useLocation, useParams } from "react-router-dom";
import { getSeller } from "@/lib/sellers";
import { TerritoryShell } from "@/components/territory/TerritoryShell";
import { useCurrentAccount } from "@/components/territory/current";
import { FRONT_DOOR, isModule, moduleHref, MODULES, type ModuleId } from "@/components/territory/nav";
import { useTerritory } from "@/components/territory/useTerritory";
import { AccountModule } from "@/components/territory/modules/AccountModule";
import { CommitteeModule } from "@/components/territory/modules/CommitteeModule";
import { DealRoomModule } from "@/components/territory/modules/DealRoomModule";
import { LookalikesModule } from "@/components/territory/modules/LookalikesModule";
import { RadarModule } from "@/components/territory/modules/RadarModule";
import type { ModuleProps } from "@/components/territory/modules/types";
import NotFound from "./NotFound";

const VIEWS: Record<ModuleId, (p: ModuleProps) => JSX.Element> = {
  radar: RadarModule,
  account: AccountModule,
  committee: CommitteeModule,
  deal: DealRoomModule,
  lookalikes: LookalikesModule,
};

/**
 * /for/:seller[/:module[/:reportId]]: the territory command center for one
 * seller (e.g. /for/omni): run an account (the front door), the radar,
 * lookalikes, the committee and the deal room. Unlisted: not in the nav or
 * the sitemap, and noindex.
 */
const ForSeller = () => {
  const { seller: sellerId, module: moduleParam, reportId } = useParams<{ seller: string; module?: string; reportId?: string }>();
  const { search } = useLocation();
  const module = moduleParam ?? FRONT_DOOR;
  const seller = getSeller(sellerId);
  const territory = useTerritory(seller?.territory?.accounts);
  // The account carried from view to view (URL, else this session's last, else the first).
  const current = useCurrentAccount(seller?.id, reportId, seller?.territory?.accounts);
  if (!seller || !isModule(module)) return <NotFound />;

  // The bare URL used to be the radar: a shared /for/omni?segment=… link still opens it.
  // The presenter walkthrough (?demo) starts on the demo account's saved run.
  if (!moduleParam) {
    const q = new URLSearchParams(search);
    const demoId = seller.territory?.accounts[0]?.reportId;
    if (q.has("segment")) return <Navigate replace to={{ pathname: moduleHref(seller.id, "radar"), search }} />;
    if (q.has("demo") && demoId) return <Navigate replace to={{ pathname: moduleHref(seller.id, "account", demoId), search }} />;
  }

  const View = VIEWS[module];
  const label = MODULES.find((m) => m.id === module)?.label;

  return (
    <HelmetProvider>
      <Helmet>
        <title>{`${label} · ${seller.name} territory | VibeCo`}</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="description" content={`Account research and first-call plans for ${seller.name} sellers, built from public sources.`} />
      </Helmet>
      <TerritoryShell seller={seller} module={module} territory={territory} current={current}>
        <View seller={seller} territory={territory} reportId={reportId} current={current.id} justRan={current.ran} />
      </TerritoryShell>
    </HelmetProvider>
  );
};

export default ForSeller;
