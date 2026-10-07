import type { SellerConfig } from "@/lib/sellers";
import type { JustRan } from "../current";
import type { TerritoryState } from "../useTerritory";

/** What every command-center view receives. */
export interface ModuleProps {
  seller: SellerConfig;
  territory: TerritoryState;
  /** The account the view is about, from the URL (/for/omni/committee/<id>). */
  reportId?: string;
  /** With no id in the URL: the last account opened this session, else the territory's first. */
  current?: string;
  /** A run from outside the territory opened in "Run an account" this session, offered as "Just ran". */
  justRan?: JustRan;
}
