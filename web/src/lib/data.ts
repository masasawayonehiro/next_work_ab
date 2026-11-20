import facilitiesJson from "@/data/facilities.json";
import jobsJson from "@/data/jobs.json";
import metaJson from "@/data/meta.json";

export type ServiceKey = "sentaku" | "ikou" | "a" | "b" | "teichaku";

export type Facility = {
  id: string;
  service: ServiceKey;
  name: string;
  kana: string;
  corpName: string;
  corpNo: string;
  ward: string;
  address: string;
  tel: string;
  fax: string;
  url: string;
  lat: number | null;
  lng: number | null;
  hours: { weekday: string; sat: string; sun: string; holiday: string };
  closed: string;
  hoursNote: string;
  capacity: number | null;
  jobIds: string[];
};

export type Job = {
  id: string;
  title: string;
  description: string;
  isA: boolean;
  employer: string;
  place: string;
  ward: string;
  wage: string;
  wageType: string;
  hours: string;
  holidays: string;
  employment: string;
  term: string;
  daysPerWeek: string;
  insurance: string;
  commute: string;
  myCar: string;
  station: string;
  access: string;
  trial: string;
  experience: string;
  license: string;
  age: string;
  business: string;
  notes: string;
  openings: string;
  receivedAt: string;
  expiresAt: string;
  office: string;
  category: string;
  url: string;
  facilityId: string | null;
  match: string;
};

export const facilities = facilitiesJson as Facility[];
export const jobs = jobsJson as Job[];
export const meta = metaJson as { wamVersion: string; hwFetchedAt: string };

const facilityById = new Map(facilities.map((f) => [f.id, f]));
const jobById = new Map(jobs.map((j) => [j.id, j]));
export const getFacility = (id: string) => facilityById.get(id);
export const getJob = (id: string) => jobById.get(id);

// サービスの表示名と、利用者向けの短い説明
export const SERVICES: Record<ServiceKey, { label: string; short: string; description: string }> = {
  a: {
    label: "就労継続支援A型",
    short: "A型",
    description: "事業所と雇用契約を結んで働きます。最低賃金以上の給料が出ます。",
  },
  b: {
    label: "就労継続支援B型",
    short: "B型",
    description: "雇用契約を結ばずに、自分のペースで作業をします。作業に応じて工賃が出ます。",
  },
  ikou: {
    label: "就労移行支援",
    short: "就労移行",
    description: "一般企業への就職を目指して、訓練や就職活動の支援を受けます（原則2年まで）。",
  },
  teichaku: {
    label: "就労定着支援",
    short: "就労定着",
    description: "就職した後、仕事を続けられるように相談や支援を受けます。",
  },
  sentaku: {
    label: "就労選択支援",
    short: "就労選択",
    description: "自分に合った働き方や事業所を選ぶために、作業体験や相談をします。",
  },
};
export const SERVICE_ORDER: ServiceKey[] = ["a", "b", "ikou", "sentaku", "teichaku"];

export const WARDS = ["中央区", "北区", "東区", "白石区", "厚別区", "豊平区", "清田区", "南区", "西区", "手稲区"];

// 一覧に並べる項目。WAM NET の事業所と、事業所に結び付かなかった求人の2種類
export type ListItem =
  | { kind: "facility"; facility: Facility; jobCount: number }
  | { kind: "job"; job: Job };

export type Filters = {
  q: string;
  services: ServiceKey[]; // 表示するサービス（種別を何も選んでいなければ全て）
  general: boolean; // 一般の障害者求人も含めるか
  wards: string[]; // 空なら全て
  hiring: boolean; // 求人のあるものだけ
};

export function parseFilters(sp: Record<string, string | string[] | undefined>): Filters {
  const arr = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
  const kinds = arr(sp.type);
  return {
    q: (Array.isArray(sp.q) ? sp.q[0] : sp.q ?? "").trim(),
    services: kinds.length === 0 ? SERVICE_ORDER : kinds.filter((k): k is ServiceKey => k in SERVICES),
    general: kinds.length === 0 || kinds.includes("general"),
    wards: arr(sp.ward).filter((w) => WARDS.includes(w)),
    hiring: sp.hiring === "1",
  };
}

const norm = (s: string) => s.normalize("NFKC").toLowerCase().replace(/\s+/g, "");

export function search(f: Filters): ListItem[] {
  const words = f.q.split(/[\s　]+/).map(norm).filter(Boolean);
  const hit = (...fields: string[]) => {
    const hay = norm(fields.join(" "));
    return words.every((w) => hay.includes(w));
  };
  const items: ListItem[] = [];
  const services = f.services;
  for (const fac of facilities) {
    if (!services.includes(fac.service)) continue;
    if (f.wards.length && !f.wards.includes(fac.ward)) continue;
    if (f.hiring && fac.jobIds.length === 0) continue;
    const jobText = fac.jobIds.map((id) => {
      const j = getJob(id);
      return j ? `${j.title} ${j.description}` : "";
    });
    if (words.length && !hit(fac.name, fac.kana, fac.corpName, fac.address, ...jobText)) continue;
    items.push({ kind: "facility", facility: fac, jobCount: fac.jobIds.length });
  }
  // 事業所に結び付かなかった求人: A型と分かるものはA型として、それ以外は一般の障害者求人として扱う
  for (const job of jobs) {
    if (job.facilityId) continue;
    const included = job.isA ? services.includes("a") : f.general;
    if (!included) continue;
    if (f.wards.length && !f.wards.includes(job.ward)) continue;
    if (words.length && !hit(job.title, job.description, job.employer, job.place)) continue;
    items.push({ kind: "job", job });
  }
  return items;
}

export const mapUrl = (f: Facility) =>
  f.lat && f.lng
    ? `https://www.google.com/maps/search/?api=1&query=${f.lat},${f.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(f.address)}`;
