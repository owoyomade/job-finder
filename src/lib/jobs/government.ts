/** Recognising public-sector postings and building links to government job sites. */

const GOV_DOMAINS = [
  "jobbank.gc.ca",
  "guichetemplois.gc.ca",
  "canada.ca",
  "gc.ca",
  "emploisfp-psjobs.cfp-psc.gc.ca",
  "ontario.ca",
  "gojobs.gov.on.ca",
  "gov.bc.ca",
  "bcpublicservice.hire.gov.bc.ca",
  "alberta.ca",
  "jobs.alberta.ca",
  "quebec.ca",
  "carrieres.gouv.qc.ca",
  "gouv.qc.ca",
  "novascotia.ca",
  "jobs.novascotia.ca",
  "gov.mb.ca",
  "saskatchewan.ca",
  "govskpsc.taleo.net",
  "gnb.ca",
  "gov.nl.ca",
  "princeedwardisland.ca",
  "gov.yk.ca",
  "gov.nt.ca",
  "gov.nu.ca",
];

const GOV_NAME = /\b(government of|gouvernement du|public service|ministry of|city of|town of|municipality of|region of|regional municipality|county of|province of|statistics canada|canada revenue agency|health canada|employment and social development|department of national defence|rcmp|royal canadian mounted police|treasury board|service canada|immigration, refugees|transport canada|environment and climate change canada|public services and procurement)\b/i;

export function isGovernmentJob(applyUrl: string, company: string, publisher?: string): boolean {
  let host = "";
  try {
    host = new URL(applyUrl).hostname.toLowerCase();
  } catch {
    /* ignore bad urls */
  }
  if (host && GOV_DOMAINS.some((d) => host === d || host.endsWith("." + d))) return true;
  if (publisher && /\b(gc jobs|job bank|government)\b/i.test(publisher) && GOV_NAME.test(company)) return true;
  return GOV_NAME.test(company);
}

export interface GovLink {
  name: string;
  level: "Federal" | "Provincial" | "Municipal";
  url: string;
  note?: string;
}

const PROVINCE_LINKS: Record<string, GovLink> = {
  ON: { name: "Ontario Public Service", level: "Provincial", url: "https://www.gojobs.gov.on.ca/Search.aspx" },
  BC: { name: "BC Public Service", level: "Provincial", url: "https://bcpublicservice.hire.gov.bc.ca/careers/" },
  AB: { name: "Alberta Public Service", level: "Provincial", url: "https://jobs.alberta.ca/" },
  QC: { name: "Québec – Carrières (fonction publique)", level: "Provincial", url: "https://www.carrieres.gouv.qc.ca/" },
  NS: { name: "Nova Scotia Government Jobs", level: "Provincial", url: "https://jobs.novascotia.ca/" },
  MB: { name: "Manitoba Government Jobs", level: "Provincial", url: "https://www.gov.mb.ca/govjobs/" },
  SK: { name: "Saskatchewan Public Service", level: "Provincial", url: "https://www.saskatchewan.ca/government/government-structure/public-service-commission/careers" },
  NB: { name: "New Brunswick Government Jobs", level: "Provincial", url: "https://www2.gnb.ca/content/gnb/en/departments/human_resources/careers.html" },
  NL: { name: "Newfoundland and Labrador Public Service", level: "Provincial", url: "https://www.gov.nl.ca/exec/hrs/working-with-us/" },
  PE: { name: "PEI Government Jobs", level: "Provincial", url: "https://www.princeedwardisland.ca/en/topic/jobs" },
};

const CITY_LINKS: Record<string, GovLink> = {
  toronto: { name: "City of Toronto Jobs", level: "Municipal", url: "https://jobs.toronto.ca/jobsatcity/" },
  ottawa: { name: "City of Ottawa Jobs", level: "Municipal", url: "https://jobs-emplois.ottawa.ca/" },
  vancouver: { name: "City of Vancouver Jobs", level: "Municipal", url: "https://vancouver.ca/your-government/work-for-the-city.aspx" },
  calgary: { name: "City of Calgary Jobs", level: "Municipal", url: "https://www.calgary.ca/careers.html" },
  edmonton: { name: "City of Edmonton Jobs", level: "Municipal", url: "https://www.edmonton.ca/city_government/jobs" },
  montreal: { name: "Ville de Montréal – Emplois", level: "Municipal", url: "https://montreal.ca/en/topics/working-city-montreal" },
  winnipeg: { name: "City of Winnipeg Jobs", level: "Municipal", url: "https://www.winnipeg.ca/hr/careers" },
  mississauga: { name: "City of Mississauga Jobs", level: "Municipal", url: "https://www.mississauga.ca/council/jobs-and-careers/" },
  brampton: { name: "City of Brampton Jobs", level: "Municipal", url: "https://www.brampton.ca/EN/City-Hall/Careers/Pages/Welcome.aspx" },
  hamilton: { name: "City of Hamilton Jobs", level: "Municipal", url: "https://www.hamilton.ca/jobs-city" },
  halifax: { name: "Halifax Regional Municipality Jobs", level: "Municipal", url: "https://www.halifax.ca/home/careers" },
  "quebec city": { name: "Ville de Québec – Emplois", level: "Municipal", url: "https://www.ville.quebec.qc.ca/apropos/emplois/" },
};

const PROVINCE_NAMES: Record<string, string> = {
  ontario: "ON", "british columbia": "BC", alberta: "AB", quebec: "QC", québec: "QC", "nova scotia": "NS",
  manitoba: "MB", saskatchewan: "SK", "new brunswick": "NB", newfoundland: "NL", "prince edward island": "PE",
};

export function provinceFromLocation(location: string): string | null {
  const code = location.match(/\b(ON|BC|AB|QC|NS|MB|SK|NB|NL|PE|YT|NT|NU)\b/)?.[1];
  if (code) return code;
  const lower = location.toLowerCase();
  for (const [name, c] of Object.entries(PROVINCE_NAMES)) if (lower.includes(name)) return c;
  for (const [city, c] of Object.entries({ toronto: "ON", ottawa: "ON", mississauga: "ON", brampton: "ON", hamilton: "ON", vancouver: "BC", calgary: "AB", edmonton: "AB", montreal: "QC", winnipeg: "MB", halifax: "NS", regina: "SK", saskatoon: "SK" })) {
    if (lower.includes(city)) return c;
  }
  return null;
}

export function governmentLinks(query: string, location: string): GovLink[] {
  const q = encodeURIComponent(query);
  const loc = encodeURIComponent(location);
  const links: GovLink[] = [
    {
      name: "GC Jobs (Federal Public Service)",
      level: "Federal",
      url: `https://emploisfp-psjobs.cfp-psc.gc.ca/psrs-srfp/applicant/page2440?fromMenu=true&toggleLanguage=en&keywords=${q}`,
      note: "Open the advanced search to filter by city",
    },
    {
      name: "Job Bank",
      level: "Federal",
      url: `https://www.jobbank.gc.ca/jobsearch/jobsearch?searchstring=${q}&locationstring=${loc}&sort=D`,
    },
    {
      name: "Canada.ca – Government jobs",
      level: "Federal",
      url: "https://www.canada.ca/en/services/jobs/opportunities/government.html",
    },
  ];
  const prov = provinceFromLocation(location);
  if (prov && PROVINCE_LINKS[prov]) links.push(PROVINCE_LINKS[prov]);
  else if (!location) links.push(...Object.values(PROVINCE_LINKS));
  const lower = location.toLowerCase();
  for (const [city, link] of Object.entries(CITY_LINKS)) if (lower.includes(city)) links.push(link);
  return links;
}
