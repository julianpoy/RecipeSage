export type RowValue = string | true | false | "partial";

export interface ComparisonRow {
  feature: string;
  recipesage: RowValue;
  competitor: RowValue;
  note?: string;
}

export interface ListItem {
  title: string;
  body: string;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface MigrationStep {
  body: string;
}

export interface CompetitorData {
  slug: string;
  name: string;
  url: string;
  tagline: string;
  subtitle: string;
  cardSummary: string;
  intro: string[];
  pricingSummary: {
    recipesage: string;
    competitor: string;
  };
  table: ComparisonRow[];
  whySwitch: ListItem[];
  competitorWins: ListItem[];
  migration: {
    headline: string;
    summary: string;
    steps: MigrationStep[];
    docsUrl?: string;
    docsLabel?: string;
    importUrl?: string;
    note?: string;
  };
  faqs: FaqItem[];
  closing: string[];
}
