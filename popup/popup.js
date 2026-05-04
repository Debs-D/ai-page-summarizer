let currentTab = null;

async function init() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;
    document.getElementById("pageTitle").textContent = tab.title || tab.url || "Unknown page";

    const { geminiApiKey } = await chrome.storage.local.get("geminiApiKey");
    if (!geminiApiKey) {
      showState("noKey");
      return;
    }

    const cached = await sendMsg({ action: "getCached", url: tab.url });
    if (cached?.success && cached.data) {
      displaySummary(cached.data, true);
      return;
    }

    showState("idle");
  } catch (err) {
    showError("INIT_FAILED");
  }
}

function showState(name) {
  const stateMap = {
    noKey:   "noKeyState",
    idle:    "idleState",
    loading: "loadingState",
    error:   "errorState",
    summary: "summaryState"
  };
  Object.values(stateMap).forEach(id => document.getElementById(id).classList.add("hidden"));
  document.getElementById(stateMap[name]).classList.remove("hidden");
}

async function summarize() {
  showState("loading");

  const res = await sendMsg({
    action: "summarize",
    tabId:  currentTab.id,
    url:    currentTab.url
  });

  if (res?.success) {
    displaySummary(res.data, res.data.fromCache);
  } else {
    showError(res?.error || "UNKNOWN");
  }
}

function displaySummary(data, fromCache) {
  fillList("summaryList",  data.summary  || []);
  fillList("insightsList", data.insights || []);

  document.getElementById("readingTime").textContent = `⏱ ${data.readingTime || "~5 min read"}`;
  document.getElementById("cacheIndicator").classList.toggle("hidden", !fromCache);

  showState("summary");
}

function fillList(listId, items) {
  const ul = document.getElementById(listId);
  ul.innerHTML = "";
  items.forEach(text => {
    const li = document.createElement("li");
    li.textContent = text;
    ul.appendChild(li);
  });
}

function showError(code) {
  const messages = {
    NO_API_KEY:     "No API key set. Open settings to add one.",
    RATE_LIMIT:     "Rate limit reached. Wait a moment and try again.",
    INVALID_KEY:    "Invalid API key. Check your settings.",
    EXTRACT_FAILED: "Could not read this page's content.",
    EMPTY_RESPONSE: "AI returned an empty response. Please try again.",
    PARSE_ERROR:    "AI response was malformed. Please try again.",
    INIT_FAILED:    "Could not load the current tab. Try reopening the extension.",
  };
  document.getElementById("errorMessage").textContent =
    messages[code] || "Something went wrong. Please try again.";
  showState("error");
}

async function copyToClipboard() {
  const bullets  = [...document.querySelectorAll("#summaryList li")].map(li => `• ${li.textContent}`);
  const insights = [...document.querySelectorAll("#insightsList li")].map(li => `→ ${li.textContent}`);
  const badge    = document.getElementById("readingTime").textContent;

  const text = [
    `Summary of: ${currentTab?.title || currentTab?.url}`,
    badge,
    "",
    "SUMMARY:",
    ...bullets,
    "",
    "KEY INSIGHTS:",
    ...insights
  ].join("\n");

  await navigator.clipboard.writeText(text);

  const btn = document.getElementById("copyBtn");
  const original = btn.textContent;
  btn.textContent = "Copied!";
  setTimeout(() => { btn.textContent = original; }, 2000);
}

function sendMsg(msg) {
  return new Promise(resolve =>
    chrome.runtime.sendMessage(msg, response => resolve(response))
  );
}

document.addEventListener("DOMContentLoaded", init);

document.getElementById("summarizeBtn").addEventListener("click", summarize);
document.getElementById("retryBtn").addEventListener("click", summarize);

document.getElementById("clearBtn").addEventListener("click", async () => {
  if (currentTab) {
    await sendMsg({ action: "clearCache", url: currentTab.url });
  }
  showState("idle");
});

document.getElementById("copyBtn").addEventListener("click", copyToClipboard);

document.getElementById("settingsBtn").addEventListener("click", () =>
  chrome.runtime.openOptionsPage()
);

document.getElementById("goToSettingsBtn").addEventListener("click", () =>
  chrome.runtime.openOptionsPage()
);
