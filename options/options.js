async function init() {
  const { geminiApiKey } = await chrome.storage.local.get("geminiApiKey");
  if (geminiApiKey) {
    document.getElementById("apiKey").value = geminiApiKey;
  }
}

function showStatus(elementId, message, type) {
  const el = document.getElementById(elementId);
  el.textContent = message;
  el.className = `status ${type}`;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 3500);
}

async function saveKey() {
  const key = document.getElementById("apiKey").value.trim();

  if (!key) {
    showStatus("status", "Please enter an API key before saving.", "error");
    return;
  }

  if (!key.startsWith("AIza")) {
    showStatus("status", "Gemini API keys start with 'AIza'. Double-check your key.", "error");
    return;
  }

  await chrome.storage.local.set({ geminiApiKey: key });
  showStatus("status", "API key saved successfully!", "success");
}

async function clearKey() {
  document.getElementById("apiKey").value = "";
  await chrome.storage.local.remove("geminiApiKey");
  showStatus("status", "API key cleared.", "success");
}

function toggleVisibility() {
  const input = document.getElementById("apiKey");
  const icon  = document.getElementById("eyeIcon");
  if (input.type === "password") {
    input.type = "text";
    icon.textContent = "🙈";
  } else {
    input.type = "password";
    icon.textContent = "👁";
  }
}

async function clearAllCache() {
  const allData   = await chrome.storage.local.get(null);
  const cacheKeys = Object.keys(allData).filter(k => k.startsWith("cache_"));

  if (cacheKeys.length === 0) {
    showStatus("cacheStatus", "No cached summaries found.", "success");
    return;
  }

  await chrome.storage.local.remove(cacheKeys);
  showStatus("cacheStatus", `Cleared ${cacheKeys.length} cached summary${cacheKeys.length !== 1 ? "s" : ""}.`, "success");
}

document.addEventListener("DOMContentLoaded", init);
document.getElementById("saveBtn").addEventListener("click", saveKey);
document.getElementById("clearKeyBtn").addEventListener("click", clearKey);
document.getElementById("toggleVisibility").addEventListener("click", toggleVisibility);
document.getElementById("clearCacheBtn").addEventListener("click", clearAllCache);

document.getElementById("apiKey").addEventListener("keydown", e => {
  if (e.key === "Enter") saveKey();
});
