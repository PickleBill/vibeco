import { HelmetProvider, Helmet } from "react-helmet-async";
import { useParams } from "react-router-dom";
import { getSeller } from "@/lib/sellers";
import { TerritoryShell } from "@/components/territory/TerritoryShell";
import { useCurrentAccount } from "@/components/territory/current";
import { isModule, MODULES, type ModuleId } from "@/components/territory/nav";
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
 * seller (e.g. /for/omni): radar, a live account run, the committee, the deal
 * room and lookalikes. Unlisted: not in the nav or the sitemap, and noindex.
 */
const ForSeller = () => {
  const { seller: sellerId, module = "radar", reportId } = useParams<{ seller: string; module?: string; reportId?: string }>();
  const seller = getSeller(sellerId);
  const territory = useTerritory(seller?.territory?.accounts);
  // The account carried from view to view (URL, else this session's last, else the first).
  const current = useCurrentAccount(seller?.id, reportId, seller?.territory?.accounts);
  if (!seller || !isModule(module)) return <NotFound />;
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
        <View seller={seller} territory={territory} reportId={reportId} current={current.id} />
      </TerritoryShell>
    </HelmetProvider>
  );
};

export default ForSeller;
