import { TRPCClientError } from "@trpc/client";
import { LANGUAGE_NAVIGATOR, getToken, setToken } from "../api/storage";
import { createTrpc } from "../api/trpc";
import {
  DEFAULT_API_BASE,
  DEFAULT_WEB_BASE,
  getApiBase,
  getEffectiveBases,
  isValidBaseUrl,
  setBaseOverrides,
} from "../config";
import { initI18n, reloadI18n, t } from "../i18n/t";
import { applyI18nToDom } from "../i18n/applyDom";
import {
  ALL_LANGUAGES,
  getLanguageDisplayName,
  getStoredLanguagePreference,
  isSupportedLanguage,
  setLanguageOverride,
} from "../i18n/language";

const showAccountSection = (loggedIn: boolean, email?: string) => {
  const loggedInMessage = document.getElementById("loggedInMessage");
  const loggedOutMessage = document.getElementById("loggedOutMessage");
  if (loggedInMessage) {
    loggedInMessage.style.display = loggedIn ? "block" : "none";
  }
  if (loggedOutMessage) {
    loggedOutMessage.style.display = loggedIn ? "none" : "block";
  }
  if (loggedIn) {
    const emailEl = document.getElementById("loggedInEmail");
    if (emailEl && email) emailEl.innerText = email;
  }
};

const refreshAccount = async () => {
  const token = await getToken();
  if (!token) {
    showAccountSection(false);
    return;
  }

  try {
    const apiBase = await getApiBase();
    const me = await createTrpc(apiBase, token).users.getMe.query();
    showAccountSection(true, me.email);
  } catch (e) {
    if (e instanceof TRPCClientError && e.data?.httpStatus === 401) {
      await setToken(null);
      showAccountSection(false);
      return;
    }
    console.error(e);
    window.alert(t("webextension.settings.accountFetchError"));
    showAccountSection(false);
  }
};

const logout = async () => {
  await setToken(null);
  showAccountSection(false);
};

const setStatus = (text: string) => {
  const el = document.getElementById("serverStatus");
  if (el) el.innerText = text;
};

const findInputById = (id: string): HTMLInputElement | null => {
  const el = document.getElementById(id);
  return el instanceof HTMLInputElement ? el : null;
};

const showHint = (id: string, text: string, isError: boolean) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerText = text;
  el.classList.toggle("error", isError);
};

const populateServerInputs = async () => {
  const { apiBaseOverride, webBaseOverride } = await getEffectiveBases();
  const apiInput = findInputById("apiBaseInput");
  const webInput = findInputById("webBaseInput");
  if (apiInput) {
    apiInput.value = apiBaseOverride || "";
    apiInput.placeholder = DEFAULT_API_BASE;
  }
  if (webInput) {
    webInput.value = webBaseOverride || "";
    webInput.placeholder = DEFAULT_WEB_BASE;
  }
  showHint(
    "apiBaseHint",
    t("webextension.settings.defaultUrl", { url: DEFAULT_API_BASE }),
    false,
  );
  showHint(
    "webBaseHint",
    t("webextension.settings.defaultUrl", { url: DEFAULT_WEB_BASE }),
    false,
  );
};

const saveServer = async () => {
  const apiInput = findInputById("apiBaseInput");
  const webInput = findInputById("webBaseInput");
  if (!apiInput || !webInput) return;

  const apiValue = apiInput.value.trim();
  const webValue = webInput.value.trim();

  if (apiValue && !isValidBaseUrl(apiValue)) {
    showHint("apiBaseHint", t("webextension.settings.invalidUrl"), true);
    return;
  }
  if (webValue && !isValidBaseUrl(webValue)) {
    showHint("webBaseHint", t("webextension.settings.invalidUrl"), true);
    return;
  }

  await setBaseOverrides({
    apiBaseOverride: apiValue ? apiValue : null,
    webBaseOverride: webValue ? webValue : null,
  });

  setStatus(t("webextension.settings.saved"));
  setTimeout(() => setStatus(""), 3000);

  await populateServerInputs();
  await refreshAccount();
};

const resetServer = async () => {
  await setBaseOverrides({
    apiBaseOverride: null,
    webBaseOverride: null,
  });
  await populateServerInputs();
  setStatus(t("webextension.settings.reset"));
  setTimeout(() => setStatus(""), 3000);
  await refreshAccount();
};

const populateLanguageSelect = async () => {
  const select = document.getElementById("languageSelect");
  if (!(select instanceof HTMLSelectElement)) return;

  select.replaceChildren();

  const navigatorOption = document.createElement("option");
  navigatorOption.value = LANGUAGE_NAVIGATOR;
  navigatorOption.textContent = t("webextension.settings.languageDefault");
  select.appendChild(navigatorOption);

  const sorted = ALL_LANGUAGES.slice().sort((a, b) =>
    getLanguageDisplayName(a).localeCompare(getLanguageDisplayName(b)),
  );
  for (const lang of sorted) {
    const opt = document.createElement("option");
    opt.value = lang;
    opt.textContent = getLanguageDisplayName(lang);
    select.appendChild(opt);
  }

  const stored = await getStoredLanguagePreference();
  select.value = stored ?? LANGUAGE_NAVIGATOR;

  select.onchange = async () => {
    const value = select.value;
    if (value === LANGUAGE_NAVIGATOR) {
      await setLanguageOverride(null);
    } else if (isSupportedLanguage(value)) {
      await setLanguageOverride(value);
    } else {
      return;
    }
    await reloadI18n();
    applyI18nToDom();
    await populateServerInputs();
    await populateLanguageSelect();
  };
};

document.addEventListener("DOMContentLoaded", () => {
  void (async () => {
    await initI18n();
    applyI18nToDom();
    await populateLanguageSelect();

    const logoutButton = document.getElementById("logoutButton");
    if (logoutButton) logoutButton.onclick = () => void logout();

    const saveButton = document.getElementById("saveServerButton");
    if (saveButton) saveButton.onclick = () => void saveServer();

    const resetButton = document.getElementById("resetServerButton");
    if (resetButton) resetButton.onclick = () => void resetServer();

    await populateServerInputs();
    await refreshAccount();
  })();
});
