// Known Workday job boards. Workday hosts most large employers' careers sites
// (5,000+ employees), and unlike Greenhouse, Lever or Ashby its board address
// can't be guessed from the name: the tenant is often not the company's name
// (Global Payments hires at "tsys", Bank of America at "ghr"). So the scan
// reads Workday only for boards listed here, each checked by hand to be live
// and to post that company's own jobs.
import { parseCompany, squash } from "./match.ts";

export interface WorkdayBoard {
  /** The company as its posts name it. */
  company: string;
  /** "equifax.wd5.myworkdayjobs.com" */
  host: string;
  /** The first path segment of the board's API: /wday/cxs/{tenant}/{site}/jobs */
  tenant: string;
  /** The careers site within the tenant ("External"). */
  site: string;
}

interface Entry extends WorkdayBoard {
  domains: string[];
  /** Other names people type for it ("Home Depot", "TSYS"). */
  names?: string[];
}

const board = (company: string, domains: string[], url: string, names: string[] = []): Entry => {
  const m = /^https:\/\/([a-z0-9-]+)\.(wd\d+\.myworkdayjobs\.com)\/([A-Za-z0-9_-]+)$/.exec(url);
  if (!m) throw new Error(`workday-boards: bad board URL ${url}`);
  return { company, domains, names, host: `${m[1]}.${m[2]}`, tenant: m[1], site: m[3] };
};

/** Southeast employers with 5,000+ people, by board. */
const ENTRIES: Entry[] = [
  board("Bank of America", ["bankofamerica.com"], "https://ghr.wd1.myworkdayjobs.com/Lateral-US", ["BofA"]),
  board("Equifax", ["equifax.com"], "https://equifax.wd5.myworkdayjobs.com/External"),
  board("IQVIA", ["iqvia.com"], "https://iqvia.wd1.myworkdayjobs.com/IQVIA"),
  board("Global Payments", ["globalpayments.com", "tsys.com"], "https://tsys.wd1.myworkdayjobs.com/TSYS", ["TSYS"]),
  board("Truist", ["truist.com"], "https://truist.wd1.myworkdayjobs.com/Careers"),
  board("Cox Enterprises", ["coxenterprises.com"], "https://cox.wd1.myworkdayjobs.com/Cox_External_Career_Site_1"),
  board("Ryder", ["ryder.com"], "https://ryder.wd5.myworkdayjobs.com/RyderCareers"),
  board("NCR Voyix", ["ncrvoyix.com"], "https://ncr.wd1.myworkdayjobs.com/ext_us"),
  board("The Home Depot", ["homedepot.com"], "https://homedepot.wd5.myworkdayjobs.com/CareerDepot", ["Home Depot"]),
  board("Lowe's", ["lowes.com"], "https://lowes.wd5.myworkdayjobs.com/LWS_External_CS"),
  board("The Coca-Cola Company", ["coca-colacompany.com"], "https://coke.wd1.myworkdayjobs.com/coca-cola-careers", ["Coca-Cola"]),
  board("Labcorp", ["labcorp.com"], "https://labcorp.wd1.myworkdayjobs.com/External"),
  board("Raymond James", ["raymondjames.com"], "https://raymondjames.wd1.myworkdayjobs.com/RaymondJamesCareers"),
  board("CarMax", ["carmax.com"], "https://carmax.wd1.myworkdayjobs.com/External"),
  board("Advance Auto Parts", ["advanceautoparts.com"], "https://advanceauto.wd5.myworkdayjobs.com/AdvanceExternalCareers"),
  board("FIS", ["fisglobal.com"], "https://fis.wd5.myworkdayjobs.com/SearchJobs"),
  board("TD SYNNEX", ["tdsynnex.com"], "https://synnex.wd5.myworkdayjobs.com/tdsynnexcareers"),
  board("Leidos", ["leidos.com"], "https://leidos.wd5.myworkdayjobs.com/External"),
  board("Chewy", ["chewy.com"], "https://chewy.wd5.myworkdayjobs.com/External"),
  board("Inspire Brands", ["inspirebrands.com"], "https://inspirebrands.wd5.myworkdayjobs.com/InspireCareers"),
  board("Freddie Mac", ["freddiemac.com"], "https://freddiemac.wd5.myworkdayjobs.com/External"),
  board("Floor & Decor", ["flooranddecor.com"], "https://flooranddecoroutlets.wd1.myworkdayjobs.com/FloorandDecorCareers"),
  board("Red Hat", ["redhat.com"], "https://redhat.wd5.myworkdayjobs.com/jobs"),
];

const LEGAL = /[\s,]+(?:inc|llc|ltd|limited|corp|corporation|co|company|plc)\.?$/i;
/** "The Home Depot, Inc." -> "homedepot"; "Floor & Decor" -> "floordecor". */
const nameKey = (name: string) => squash(name.trim().replace(LEGAL, "").replace(/^the\s+/i, "").replace(/&|\band\b/gi, ""));
const hostOf = (s: string) => s.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0];

const BY_DOMAIN = new Map<string, Entry>();
const BY_NAME = new Map<string, Entry>();
for (const e of ENTRIES) {
  for (const d of e.domains) BY_DOMAIN.set(d, e);
  for (const n of [e.company, ...(e.names ?? [])]) BY_NAME.set(nameKey(n), e);
}

/**
 * The company's Workday board, if it's a known one: by domain ("equifax.com",
 * "careers.equifax.com"), else by name ("The Home Depot", "Home Depot, Inc.").
 * Takes what the user typed ("Equifax (equifax.com)") or a name and a domain.
 */
export function workdayBoardFor(company: string, domain?: string): WorkdayBoard | undefined {
  const parsed = parseCompany(company);
  for (const d of [domain, parsed.domain].filter((d): d is string => !!d).map(hostOf)) {
    const labels = d.split(".");
    // careers.equifax.com -> equifax.com
    for (let i = 0; i < labels.length - 1; i++) {
      const hit = BY_DOMAIN.get(labels.slice(i).join("."));
      if (hit) return publicBoard(hit);
    }
  }
  // A bare domain we don't know isn't a name to match on.
  if (parsed.domain && parsed.name === company.trim()) return undefined;
  const hit = BY_NAME.get(nameKey(parsed.name));
  return hit ? publicBoard(hit) : undefined;
}

const publicBoard = ({ company, host, tenant, site }: Entry): WorkdayBoard => ({ company, host, tenant, site });

/** Every known board, for diagnostics and tests. */
export const WORKDAY_BOARDS: readonly WorkdayBoard[] = ENTRIES.map(publicBoard);
