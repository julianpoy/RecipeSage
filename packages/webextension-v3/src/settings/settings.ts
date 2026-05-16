import { TRPCClientError } from "@trpc/client";
import { getToken, setToken } from "../api/storage";
import { createTrpc } from "../api/trpc";
import {
  DEFAULT_API_BASE,
  DEFAULT_WEB_BASE,
  getApiBase,
  getEffectiveBases,
  isValidBaseUrl,
  setBaseOverrides,
} from "../config";

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
    window.alert("There was an error while fetching your account data.");
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
  showHint("apiBaseHint", `Default: ${DEFAULT_API_BASE}`, false);
  showHint("webBaseHint", `Default: ${DEFAULT_WEB_BASE}`, false);
};

const saveServer = async () => {
  const apiInput = findInputById("apiBaseInput");
  const webInput = findInputById("webBaseInput");
  if (!apiInput || !webInput) return;

  const apiValue = apiInput.value.trim();
  const webValue = webInput.value.trim();

  if (apiValue && !isValidBaseUrl(apiValue)) {
    showHint("apiBaseHint", "Must be a valid http(s) URL", true);
    return;
  }
  if (webValue && !isValidBaseUrl(webValue)) {
    showHint("webBaseHint", "Must be a valid http(s) URL", true);
    return;
  }

  await setBaseOverrides({
    apiBaseOverride: apiValue ? apiValue : null,
    webBaseOverride: webValue ? webValue : null,
  });

  setStatus("Saved.");
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
  setStatus("Reset to defaults.");
  setTimeout(() => setStatus(""), 3000);
  await refreshAccount();
};

document.addEventListener("DOMContentLoaded", () => {
  const logoutButton = document.getElementById("logoutButton");
  if (logoutButton) logoutButton.onclick = () => void logout();

  const saveButton = document.getElementById("saveServerButton");
  if (saveButton) saveButton.onclick = () => void saveServer();

  const resetButton = document.getElementById("resetServerButton");
  if (resetButton) resetButton.onclick = () => void resetServer();

  void populateServerInputs();
  void refreshAccount();
});
