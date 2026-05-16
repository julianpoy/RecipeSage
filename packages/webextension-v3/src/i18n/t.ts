import { SupportedLanguages } from "@recipesage/util/shared";
import { getEffectiveLanguage } from "./language";

type Messages = Record<string, string>;

const FALLBACK_LANG = SupportedLanguages.EN_US;

let activeLang: SupportedLanguages = FALLBACK_LANG;
let activeMessages: Messages = {};
let fallbackMessages: Messages = {};
let initPromise: Promise<void> | null = null;

const fetchMessages = async (lang: SupportedLanguages): Promise<Messages> => {
  const url = chrome.runtime.getURL(`i18n/${lang}.json`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load i18n file ${url}: ${res.status}`);
  }
  const json: unknown = await res.json();
  if (!json || typeof json !== "object") {
    throw new Error(`Invalid i18n file ${url}: not an object`);
  }
  const out: Messages = {};
  for (const [key, value] of Object.entries(json)) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
};

const interpolate = (
  template: string,
  params?: Record<string, string | number>,
): string => {
  if (!params) return template;
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined || value === null ? match : String(value);
  });
};

export const initI18n = async (): Promise<void> => {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const target = await getEffectiveLanguage();
    activeLang = target;

    if (target === FALLBACK_LANG) {
      const messages = await fetchMessages(FALLBACK_LANG);
      activeMessages = messages;
      fallbackMessages = messages;
      return;
    }

    const [active, fallback] = await Promise.all([
      fetchMessages(target).catch(() => ({}) as Messages),
      fetchMessages(FALLBACK_LANG),
    ]);
    activeMessages = active;
    fallbackMessages = fallback;
  })();
  return initPromise;
};

export const reloadI18n = async (): Promise<void> => {
  initPromise = null;
  await initI18n();
};

export const t = (
  key: string,
  params?: Record<string, string | number>,
): string => {
  const raw = activeMessages[key] ?? fallbackMessages[key] ?? key;
  return interpolate(raw, params);
};

export const getActiveLanguage = (): SupportedLanguages => activeLang;
