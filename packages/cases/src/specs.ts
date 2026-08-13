import type {
  InterventionType,
  NodeKind,
  ScenarioClassification,
  ShockOperation,
} from "../../core/src/index";

export interface CaseStageSpec {
  key: string;
  label: string;
  kind: NodeKind;
  criticality: number;
}

export interface CaseInterventionSpec {
  key: string;
  label: string;
  type: InterventionType;
  targetStage?: number;
  targetLink?: number;
  cost: number;
  leadTimeDays: number;
  effect: number;
}

export interface ReferenceCaseSpec {
  slug: string;
  title: string;
  shortTitle: string;
  domain: string;
  classification: ScenarioClassification;
  summary: string;
  decisionQuestion: string;
  shockLabel: string;
  shockOperation: ShockOperation;
  shockMagnitude: number;
  stages: CaseStageSpec[];
  linkWeights: number[];
  topology?:
    | "chain"
    | "branch_merge"
    | "cycle"
    | "dynamic_activation"
    | "dynamic_expiry";
  horizonsDays?: number[];
  constraints?: {
    budget: number;
    maxInterventions: number;
    maxLeadTimeDays: number;
  };
  interventions: CaseInterventionSpec[];
  context: {
    title: string;
    publisher: string;
    uri: string;
    availableAt: string;
  };
  tags: string[];
  specificLimitation: string;
}

const standardInterventions = (
  buffer: string,
  diversify: string,
  reroute: string,
): CaseInterventionSpec[] => [
  {
    key: "buffer",
    label: buffer,
    type: "buffer",
    targetStage: 1,
    cost: 8,
    leadTimeDays: 14,
    effect: 0.35,
  },
  {
    key: "diversify",
    label: diversify,
    type: "diversify",
    targetLink: 1,
    cost: 13,
    leadTimeDays: 45,
    effect: 0.5,
  },
  {
    key: "reroute",
    label: reroute,
    type: "reroute",
    targetLink: 0,
    cost: 11,
    leadTimeDays: 7,
    effect: 0.4,
  },
];

export const referenceCaseSpecs: ReferenceCaseSpec[] = [
  {
    slug: "suez-route-restress",
    title: "Suez route closure re-stress",
    shortTitle: "Suez route",
    domain: "Maritime trade",
    classification: "quasi_historical",
    summary: "A forward-dated re-stress of a Suez route interruption across a deliberately assumed maritime-to-production dependency chain.",
    decisionQuestion: "Which bounded intervention remains feasible if the Suez route becomes unavailable for a short planning horizon?",
    shockLabel: "Suez route unavailable",
    shockOperation: "disable",
    shockMagnitude: 1,
    stages: [
      { key: "suez", label: "Suez route", kind: "route", criticality: 1.3 },
      { key: "maritime-inputs", label: "Time-sensitive maritime inputs", kind: "product", criticality: 1.1 },
      { key: "assembly", label: "Import-dependent assembly", kind: "industry", criticality: 1.4 },
      { key: "distribution", label: "Regional distribution", kind: "industry", criticality: 1.2 },
      { key: "market", label: "Downstream market availability", kind: "region", criticality: 1.5 },
    ],
    linkWeights: [0.76, 0.58, 0.55, 0.48, 0.2],
    interventions: standardInterventions("Increase input buffer", "Diversify assembly inputs", "Use alternate maritime routing"),
    context: {
      title: "Navigation in the Suez Canal restored after the Ever Given incident",
      publisher: "Suez Canal Authority",
      uri: "https://www.suezcanal.gov.eg/English/MediaCenter/News/Pages/31-3-2021.aspx",
      availableAt: "2021-03-31T00:00:00Z",
    },
    tags: ["shipping", "route", "trade"],
    specificLimitation: "The topology and all dependency weights are research assumptions, not reconstructed 2021 trade flows.",
  },
  {
    slug: "semiconductor-capacity-restress",
    title: "Semiconductor capacity re-stress",
    shortTitle: "Semiconductors",
    domain: "Advanced manufacturing",
    classification: "quasi_historical",
    summary: "A forward-dated semiconductor capacity stress across assumed fabrication, component, assembly, and production dependencies.",
    decisionQuestion: "How do inventory, supplier diversification, and allocation compare under bounded chip-capacity loss?",
    shockLabel: "Fabrication capacity reduction",
    shockOperation: "multiply_capacity",
    shockMagnitude: 0.45,
    stages: [
      { key: "fabs", label: "Semiconductor fabrication capacity", kind: "facility", criticality: 1.5 },
      { key: "chips", label: "Application-specific chips", kind: "product", criticality: 1.4 },
      { key: "modules", label: "Electronic modules", kind: "industry", criticality: 1.1 },
      { key: "manufacturing", label: "Downstream manufacturing", kind: "industry", criticality: 1.5 },
      { key: "deliveries", label: "Finished-goods deliveries", kind: "metric", criticality: 1.2 },
    ],
    linkWeights: [0.81, 0.66, 0.62, 0.44, 0.19],
    topology: "branch_merge",
    interventions: standardInterventions("Increase chip inventory", "Qualify alternate chip designs", "Reallocate available fabrication"),
    context: {
      title: "Results from Semiconductor Supply Chain Request for Information",
      publisher: "U.S. Department of Commerce",
      uri: "https://www.commerce.gov/news/blog/2022/01/results-semiconductor-supply-chain-request-information",
      availableAt: "2022-01-25T00:00:00Z",
    },
    tags: ["semiconductors", "manufacturing", "capacity"],
    specificLimitation: "The case does not estimate any company, facility, or sector's actual production loss.",
  },
  {
    slug: "medical-ppe-demand-restress",
    title: "Medical PPE demand re-stress",
    shortTitle: "Medical PPE",
    domain: "Public health supply",
    classification: "quasi_historical",
    summary: "A forward-dated demand surge across an assumed personal-protective-equipment supply and care-delivery topology.",
    decisionQuestion: "Which feasible supply intervention best limits bounded access disruption during a PPE demand surge?",
    shockLabel: "PPE demand surge",
    shockOperation: "increase_demand",
    shockMagnitude: 1.2,
    stages: [
      { key: "ppe-demand", label: "PPE demand pressure", kind: "event", criticality: 1.2 },
      { key: "ppe", label: "Protective equipment supply", kind: "product", criticality: 1.5 },
      { key: "distribution", label: "Medical distribution", kind: "industry", criticality: 1.3 },
      { key: "care", label: "Care delivery capacity", kind: "industry", criticality: 1.6 },
      { key: "access", label: "Patient access continuity", kind: "metric", criticality: 1.5 },
    ],
    linkWeights: [0.72, 0.61, 0.67, 0.52, 0.21],
    topology: "branch_merge",
    horizonsDays: [7, 21, 60],
    interventions: standardInterventions("Build PPE buffer", "Diversify PPE suppliers", "Prioritize scarce PPE allocation"),
    context: {
      title: "Shortage of personal protective equipment endangering health workers worldwide",
      publisher: "World Health Organization",
      uri: "https://www.who.int/news/item/03-03-2020-shortage-of-personal-protective-equipment-endangering-health-workers-worldwide",
      availableAt: "2020-03-03T00:00:00Z",
    },
    tags: ["health", "PPE", "demand"],
    specificLimitation: "The case is not a clinical model, shortage forecast, or emergency-response recommendation.",
  },
  {
    slug: "ukraine-commodity-compound-restress",
    title: "Food, fertilizer, and energy compound re-stress",
    shortTitle: "Commodity compound",
    domain: "Food and energy",
    classification: "quasi_historical",
    summary: "A compound forward stress joining assumed food, fertilizer, energy, logistics, and affordability dependencies.",
    decisionQuestion: "Which combination of buffers and substitution remains robust when several commodity channels move together?",
    shockLabel: "Compound commodity supply restriction",
    shockOperation: "reduce_supply",
    shockMagnitude: 0.6,
    stages: [
      { key: "commodity-supply", label: "Food, fertilizer, and energy supply", kind: "product", criticality: 1.6 },
      { key: "farm-inputs", label: "Agricultural input availability", kind: "industry", criticality: 1.4 },
      { key: "food-output", label: "Food production", kind: "industry", criticality: 1.6 },
      { key: "distribution", label: "Regional food distribution", kind: "industry", criticality: 1.3 },
      { key: "affordability", label: "Food affordability pressure", kind: "metric", criticality: 1.7 },
    ],
    linkWeights: [0.7, 0.63, 0.59, 0.56, 0.24],
    topology: "cycle",
    interventions: standardInterventions("Increase essential-input reserves", "Substitute farm inputs", "Re-route food distribution"),
    context: {
      title: "Food and Energy Price Shocks from Ukraine War",
      publisher: "World Bank",
      uri: "https://www.worldbank.org/en/news/press-release/2022/04/26/food-and-energy-price-shocks-from-ukraine-war",
      availableAt: "2022-04-26T00:00:00Z",
    },
    tags: ["food", "fertilizer", "energy", "compound"],
    specificLimitation: "No country-level price, hunger, or welfare effect is estimated.",
  },
  {
    slug: "panama-drought-restress",
    title: "Panama Canal drought re-stress",
    shortTitle: "Panama drought",
    domain: "Climate and logistics",
    classification: "quasi_historical",
    summary: "A forward-dated transit-capacity stress linking an assumed canal constraint to shipping, inventories, production, and service levels.",
    decisionQuestion: "When does route diversification become preferable to inventory buffering under a canal-capacity constraint?",
    shockLabel: "Canal transit capacity reduction",
    shockOperation: "multiply_capacity",
    shockMagnitude: 0.55,
    stages: [
      { key: "canal", label: "Panama Canal transit capacity", kind: "route", criticality: 1.4 },
      { key: "shipping", label: "Affected shipping services", kind: "industry", criticality: 1.2 },
      { key: "inventory", label: "Importer inventory continuity", kind: "metric", criticality: 1.3 },
      { key: "production", label: "Import-dependent production", kind: "industry", criticality: 1.5 },
      { key: "service", label: "Downstream service level", kind: "metric", criticality: 1.3 },
    ],
    linkWeights: [0.77, 0.54, 0.6, 0.47, 0.18],
    topology: "dynamic_activation",
    interventions: standardInterventions("Increase importer inventory", "Diversify route exposure", "Use alternate ocean routing"),
    context: {
      title: "Panama Canal Authority adapts to unprecedented challenges",
      publisher: "Panama Canal Authority",
      uri: "https://pancanal.com/en/panama-canal-authority-adapts-to-unprecedented-challenges/",
      availableAt: "2023-10-03T00:00:00Z",
    },
    tags: ["climate", "canal", "shipping"],
    specificLimitation: "The case does not reconstruct actual vessel queues, tolls, or shipment volumes.",
  },
  {
    slug: "red-sea-rerouting-restress",
    title: "Red Sea rerouting re-stress",
    shortTitle: "Red Sea routing",
    domain: "Geopolitics and shipping",
    classification: "quasi_historical",
    summary: "A forward-dated shipping-route stress across assumed voyage-time, input, production, and delivery dependencies.",
    decisionQuestion: "Which intervention minimizes upper-bound continuity loss when vessels avoid the Red Sea route?",
    shockLabel: "Red Sea route restriction",
    shockOperation: "policy_restrict",
    shockMagnitude: 0.75,
    stages: [
      { key: "red-sea", label: "Red Sea shipping route", kind: "route", criticality: 1.4 },
      { key: "voyage", label: "Long-haul voyage capacity", kind: "industry", criticality: 1.2 },
      { key: "inputs", label: "Imported production inputs", kind: "product", criticality: 1.3 },
      { key: "production", label: "Downstream production", kind: "industry", criticality: 1.5 },
      { key: "delivery", label: "Delivery continuity", kind: "metric", criticality: 1.4 },
    ],
    linkWeights: [0.74, 0.57, 0.63, 0.51, 0.2],
    topology: "dynamic_expiry",
    interventions: standardInterventions("Increase transit-time buffer", "Diversify imported inputs", "Route around the Cape"),
    context: {
      title: "Navigating troubled waters: Impact to global trade of disruption of shipping routes",
      publisher: "UN Trade and Development",
      uri: "https://unctad.org/publication/navigating-troubled-waters-impact-global-trade-disruption-shipping-routes-red-sea-black",
      availableAt: "2024-02-22T00:00:00Z",
    },
    tags: ["shipping", "geopolitics", "rerouting"],
    specificLimitation: "The case does not claim actual freight-rate, emissions, or delivery-time effects.",
  },
  {
    slug: "baltimore-port-restress",
    title: "Baltimore port access re-stress",
    shortTitle: "Baltimore port",
    domain: "Port infrastructure",
    classification: "quasi_historical",
    summary: "A forward-dated port-access interruption across assumed terminal, automotive logistics, manufacturing, and delivery links.",
    decisionQuestion: "How do alternate ports and inventory buffers compare under a sudden port-access loss?",
    shockLabel: "Port access disabled",
    shockOperation: "disable",
    shockMagnitude: 1,
    stages: [
      { key: "port-access", label: "Port access channel", kind: "route", criticality: 1.4 },
      { key: "terminal", label: "Terminal handling capacity", kind: "port", criticality: 1.3 },
      { key: "vehicle-flow", label: "Vehicle and machinery flows", kind: "product", criticality: 1.2 },
      { key: "manufacturing", label: "Regional manufacturing", kind: "industry", criticality: 1.4 },
      { key: "deliveries", label: "Customer deliveries", kind: "metric", criticality: 1.2 },
    ],
    linkWeights: [0.82, 0.61, 0.54, 0.43, 0.17],
    interventions: standardInterventions("Increase inland inventory", "Diversify port gateways", "Redirect cargo to alternate ports"),
    context: {
      title: "NTSB opens public docket on Francis Scott Key Bridge investigation",
      publisher: "National Transportation Safety Board",
      uri: "https://www.ntsb.gov/news/press-releases/Pages/NR20240624.aspx",
      availableAt: "2024-06-24T00:00:00Z",
    },
    tags: ["port", "infrastructure", "logistics"],
    specificLimitation: "The case is not an engineering reconstruction or estimate of the 2024 incident's realized losses.",
  },
  {
    slug: "refining-hurricane-restress",
    title: "Hurricane refining re-stress",
    shortTitle: "Refining hurricane",
    domain: "Energy infrastructure",
    classification: "quasi_historical",
    summary: "A forward-dated refining-capacity interruption across assumed fuel, transport, distribution, and essential-service links.",
    decisionQuestion: "Which reserve, rerouting, or demand-management bundle is feasible under bounded refining disruption?",
    shockLabel: "Refining capacity reduction",
    shockOperation: "multiply_capacity",
    shockMagnitude: 0.35,
    stages: [
      { key: "refining", label: "Regional refining capacity", kind: "facility", criticality: 1.5 },
      { key: "fuel", label: "Transport fuel availability", kind: "product", criticality: 1.5 },
      { key: "transport", label: "Freight transport operations", kind: "industry", criticality: 1.4 },
      { key: "distribution", label: "Regional distribution", kind: "industry", criticality: 1.3 },
      { key: "services", label: "Essential service continuity", kind: "metric", criticality: 1.7 },
    ],
    linkWeights: [0.79, 0.65, 0.58, 0.5, 0.23],
    interventions: standardInterventions("Release fuel buffer", "Diversify fuel supply", "Reroute fuel distribution"),
    context: {
      title: "Hurricane Ida caused widespread refinery and pipeline outages",
      publisher: "U.S. Energy Information Administration",
      uri: "https://www.eia.gov/todayinenergy/detail.php?id=49576",
      availableAt: "2021-09-16T00:00:00Z",
    },
    tags: ["energy", "hurricane", "refining"],
    specificLimitation: "The case is not a weather forecast or estimate of realized fuel-market impacts.",
  },
  {
    slug: "critical-minerals-export-stress",
    title: "Critical-minerals export-control stress",
    shortTitle: "Critical minerals",
    domain: "Minerals and technology",
    classification: "synthetic_stress",
    summary: "A synthetic export-control stress across an assumed mineral, component, manufacturing, and infrastructure chain.",
    decisionQuestion: "What is the value of diversification and additional evidence under a concentrated critical-mineral dependency?",
    shockLabel: "Critical-mineral export restriction",
    shockOperation: "policy_restrict",
    shockMagnitude: 0.7,
    stages: [
      { key: "exports", label: "Critical-mineral exports", kind: "policy", criticality: 1.4 },
      { key: "mineral", label: "Processed critical mineral", kind: "product", criticality: 1.5 },
      { key: "component", label: "Technology components", kind: "product", criticality: 1.4 },
      { key: "manufacturing", label: "Advanced manufacturing", kind: "industry", criticality: 1.6 },
      { key: "infrastructure", label: "Infrastructure delivery", kind: "metric", criticality: 1.3 },
    ],
    linkWeights: [0.84, 0.7, 0.64, 0.48, 0.26],
    horizonsDays: [14, 45, 120],
    constraints: { budget: 18, maxInterventions: 1, maxLeadTimeDays: 30 },
    interventions: standardInterventions("Increase mineral buffer", "Qualify alternate mineral supply", "Reallocate material to critical uses"),
    context: {
      title: "2026 IEA Ministerial Declaration supporting critical-minerals security",
      publisher: "International Energy Agency",
      uri: "https://www.iea.org/news/2026-iea-ministerial-declaration-supporting-the-iea-s-work-on-critical-minerals-security",
      availableAt: "2026-02-19T00:00:00Z",
    },
    tags: ["minerals", "technology", "export-controls"],
    specificLimitation: "The synthetic topology does not represent a named mineral, country, firm, or actual export-control measure.",
  },
  {
    slug: "ofac-list-change-stress",
    title: "Sanctions-list change stress",
    shortTitle: "Sanctions change",
    domain: "Financial and compliance operations",
    classification: "synthetic_stress",
    summary: "A synthetic operational stress exploring how a sanctions-list change could affect assumed screening, payment, supplier, and delivery dependencies.",
    decisionQuestion: "Which operational safeguard limits disruption while preserving a fail-closed compliance boundary?",
    shockLabel: "Counterparty eligibility restriction",
    shockOperation: "policy_restrict",
    shockMagnitude: 0.5,
    stages: [
      { key: "list-change", label: "Sanctions-list change", kind: "policy", criticality: 1.6 },
      { key: "screening", label: "Counterparty screening queue", kind: "industry", criticality: 1.4 },
      { key: "payments", label: "Payment processing continuity", kind: "industry", criticality: 1.4 },
      { key: "suppliers", label: "Supplier transaction continuity", kind: "industry", criticality: 1.3 },
      { key: "delivery", label: "Order delivery continuity", kind: "metric", criticality: 1.2 },
    ],
    linkWeights: [0.73, 0.59, 0.57, 0.45, 0.18],
    horizonsDays: [3, 14, 60],
    constraints: { budget: 12, maxInterventions: 1, maxLeadTimeDays: 21 },
    interventions: standardInterventions("Add screening review capacity", "Diversify eligible suppliers", "Route transactions for manual review"),
    context: {
      title: "Sanctions List Service",
      publisher: "U.S. Department of the Treasury, Office of Foreign Assets Control",
      uri: "https://ofac.treasury.gov/sanctions-list-service",
      availableAt: "2024-05-06T00:00:00Z",
    },
    tags: ["sanctions", "finance", "compliance"],
    specificLimitation: "This is not sanctions screening, legal advice, or a determination that any party is restricted.",
  },
  {
    slug: "drug-shortage-restress",
    title: "Drug-shortage re-stress",
    shortTitle: "Drug shortage",
    domain: "Medicines",
    classification: "quasi_historical",
    summary: "A forward-dated medicine-supply stress across assumed manufacturer, wholesaler, care-site, and treatment-access links.",
    decisionQuestion: "Which bounded supply intervention remains feasible when a medicine becomes constrained?",
    shockLabel: "Medicine supply reduction",
    shockOperation: "reduce_supply",
    shockMagnitude: 0.65,
    stages: [
      { key: "supply", label: "Medicine supply", kind: "medicine", criticality: 1.6 },
      { key: "manufacturer", label: "Manufacturer availability", kind: "industry", criticality: 1.4 },
      { key: "wholesale", label: "Wholesale distribution", kind: "industry", criticality: 1.3 },
      { key: "care-sites", label: "Care-site inventory", kind: "facility", criticality: 1.5 },
      { key: "access", label: "Treatment access continuity", kind: "metric", criticality: 1.8 },
    ],
    linkWeights: [0.78, 0.62, 0.6, 0.57, 0.22],
    horizonsDays: [7, 21, 60],
    interventions: standardInterventions("Increase medicine buffer", "Qualify alternate supply", "Prioritize distribution to care sites"),
    context: {
      title: "openFDA Drug Shortages API",
      publisher: "U.S. Food and Drug Administration",
      uri: "https://open.fda.gov/apis/drug/drugshortages/",
      availableAt: "2023-01-01T00:00:00Z",
    },
    tags: ["medicine", "shortage", "health"],
    specificLimitation: "The case is not a clinical recommendation and uses no current shortage record as a factual input.",
  },
  {
    slug: "food-export-compound-stress",
    title: "Food production and export-restriction compound stress",
    shortTitle: "Food export compound",
    domain: "Agriculture and trade",
    classification: "synthetic_stress",
    summary: "A synthetic compound stress linking assumed production loss and export restriction to processing, trade, distribution, and affordability.",
    decisionQuestion: "Which reserve and diversification choices stay on the Pareto frontier under a two-channel food stress?",
    shockLabel: "Food production restriction",
    shockOperation: "reduce_supply",
    shockMagnitude: 0.55,
    stages: [
      { key: "production", label: "Food production capacity", kind: "industry", criticality: 1.6 },
      { key: "commodity", label: "Tradable food commodity", kind: "product", criticality: 1.5 },
      { key: "exports", label: "Export availability", kind: "policy", criticality: 1.4 },
      { key: "distribution", label: "Import-market distribution", kind: "industry", criticality: 1.4 },
      { key: "affordability", label: "Food affordability continuity", kind: "metric", criticality: 1.8 },
    ],
    linkWeights: [0.75, 0.69, 0.61, 0.54, 0.25],
    interventions: standardInterventions("Release food reserve", "Diversify import sources", "Reroute food distribution"),
    context: {
      title: "FAOSTAT data portal",
      publisher: "Food and Agriculture Organization of the United Nations",
      uri: "https://www.fao.org/faostat/en/",
      availableAt: "2020-01-01T00:00:00Z",
    },
    tags: ["food", "trade", "compound"],
    specificLimitation: "No current production, trade, price, or food-security observation is included in the model topology.",
  },
];

if (referenceCaseSpecs.length !== 12) {
  throw new Error(`Expected exactly 12 reference cases, received ${referenceCaseSpecs.length}.`);
}
