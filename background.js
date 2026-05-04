const DEFAULT_API_KEY = "AIzaSyDZvPIodTYWE6LzAuOUYroFNhsILIqur8A";

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.storage.local.set({ geminiApiKey: DEFAULT_API_KEY });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "summarize") {
    handleSummarize(message.tabId, message.url)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.action === "getCached") {
    getCached(message.url)
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.action === "clearCache") {
    clearCache(message.url)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

async function handleSummarize(tabId, url) {
  const cached = await getCached(url);
  if (cached) return { ...cached, fromCache: true };

  const stored = await chrome.storage.local.get("geminiApiKey");
  const geminiApiKey = stored.geminiApiKey || DEFAULT_API_KEY;
  if (!geminiApiKey) throw new Error("NO_API_KEY");

  const pageData = await extractContent(tabId);
  const summary = await callGemini(pageData, geminiApiKey);

  await saveCache(url, summary);

  return { ...summary, fromCache: false };
}

async function extractContent(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["lib/Readability.js"]
  });

  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      try {
        const clone = document.cloneNode(true);
        const reader = new Readability(clone);
        const article = reader.parse();
        const text = article?.textContent || document.body.innerText;
        const words = text.trim().split(/\s+/).filter(Boolean);
        return {
          title: document.title,
          content: words.slice(0, 4000).join(" "),
          wordCount: words.length,
          url: window.location.href
        };
      } catch {
        const text = document.body.innerText || "";
        return {
          title: document.title,
          content: text.slice(0, 20000),
          wordCount: text.split(/\s+/).length,
          url: window.location.href
        };
      }
    }
  });

  if (!results?.[0]?.result) throw new Error("EXTRACT_FAILED");
  return results[0].result;
}

async function callGemini(pageData, apiKey) {
  const { title, content, wordCount } = pageData;
  const readingTime = Math.max(1, Math.round(wordCount / 200));

  const prompt = `You are a helpful assistant that summarizes web pages.

Analyze the following webpage and respond with ONLY valid JSON (no markdown, no code blocks, no explanation):
{
  "summary": ["bullet point 1", "bullet point 2", "bullet point 3", "bullet point 4", "bullet point 5"],
  "insights": ["key insight 1", "key insight 2", "key insight 3"],
  "readingTime": "${readingTime} minute${readingTime !== 1 ? "s" : ""}"
}

Page Title: ${title}

Page Content:
${content}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 4096,
          temperature: 0.3,
          thinkingConfig: { thinkingBudget: 0 }
        }
      })
    }
  );

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    console.error("Gemini API error:", res.status, JSON.stringify(errBody));
    if (res.status === 429) throw new Error("RATE_LIMIT");
    if (res.status === 400) throw new Error("INVALID_KEY");
    throw new Error(`API_ERROR_${res.status}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("EMPTY_RESPONSE");

  try {
    const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(clean);
  } catch {
    throw new Error("PARSE_ERROR");
  }
}

async function getCached(url) {
  const key = `cache_${url}`;
  const result = await chrome.storage.local.get(key);
  return result[key] || null;
}

async function saveCache(url, summary) {
  await chrome.storage.local.set({ [`cache_${url}`]: summary });
}

async function clearCache(url) {
  await chrome.storage.local.remove(`cache_${url}`);
}
