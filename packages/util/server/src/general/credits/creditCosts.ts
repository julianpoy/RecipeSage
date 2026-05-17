export const FREE_DAILY_CREDITS = 14;
export const CONTRIBUTOR_DAILY_CREDITS = 140;

export const CreditOperations = {
  MlTextRecipe: "mlTextRecipe",
  MlTextNutrition: "mlTextNutrition",
  MlOcr: "mlOcr",
  MlPdf: "mlPdf",
  MlDocument: "mlDocument",
  ClipHtml: "clipHtml",
  ClipUrl: "clipUrl",
  ImportUrls: "importUrls",
  ImportTextfiles: "importTextfiles",
  AssistantMessage: "assistantMessage",
} as const;

export type CreditOperation =
  (typeof CreditOperations)[keyof typeof CreditOperations];

export const CREDIT_COSTS: Record<CreditOperation, number> = {
  mlTextRecipe: 1,
  mlTextNutrition: 1,
  mlOcr: 2,
  mlPdf: 2,
  mlDocument: 2,
  clipHtml: 1,
  clipUrl: 2,
  importUrls: 5,
  importTextfiles: 5,
  assistantMessage: 1,
};
