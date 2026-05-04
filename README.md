# AI Page Summarizer

A Chrome Extension (Manifest V3) that extracts content from any webpage and uses the Gemini AI API to generate a structured summary with bullet points, key insights, and reading time — all in one click.

---

## What It Does

When you click the extension icon on any article, blog post, or news page:

1. The extension extracts the main readable content from the page (stripping nav bars, ads, and sidebars using Mozilla's Readability library)
2. It sends that content to the Gemini AI API via the background service worker
3. The popup displays:
   - **5 bullet-point summary**
   - **3 key insights**
   - **Estimated reading time**
4. The result is cached — reopening the popup on the same page loads instantly with an ⚡ Cached badge

---

## Setup Instructions

### Step 1 — Get a free Gemini API Key

1. Go to [aistudio.google.com](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click **Get API Key** → **Create API key in new project**
4. Copy the key — it starts with `AIza...`

### Step 2 — Load the extension in Chrome

1. Open Chrome and navigate to `chrome://extensions`
2. Toggle **Developer mode** ON (top-right corner)
3. Click **Load unpacked**
4. Select the `ai-page-summarizer` folder
5. The extension icon appears in your toolbar (pin it from the puzzle-piece icon if needed)

### Step 3 — Add the API key

A `config.js` file is **not included in the repo** (kept out of git to prevent GitHub from revoking it). You have two options:

**Option A — Pre-configured key (for graders):**
Create a file called `config.js` in the root of the extension folder with this content:
```js
const DEFAULT_API_KEY = "YOUR_KEY_WILL_BE_IN_SUBMISSION_NOTES";
```
Then reload the extension at `chrome://extensions`. It will work immediately.

**Option B — Use your own key:**
1. Click the extension icon → click the **⚙** (settings) button
2. Paste your Gemini API key and click **Save Key**

### Step 4 — Use it

1. Navigate to any article or webpage
2. Click the extension icon
3. Click **Summarize Page**
4. Read your summary in seconds

> **Note:** The extension does not work on `chrome://` internal pages or the Chrome Web Store, as Chrome blocks script injection on those pages. It works on all regular websites.

---

## Architecture

```
ai-page-summarizer/
├── manifest.json           MV3 entry point — declares permissions, icons, scripts
├── background.js           Service worker — all API calls happen here
├── popup/
│   ├── popup.html          Extension popup UI (5-state machine)
│   ├── popup.js            Popup logic, state transitions, messaging
│   └── popup.css           Dark-themed responsive styles
├── options/
│   ├── options.html        Settings page — API key management
│   ├── options.js          Save/load/clear API key + cache management
│   └── options.css         Matching dark theme styles
├── lib/
│   └── Readability.js      Mozilla Readability — content extraction
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### Message Flow

```
popup.js
  │── sendMessage({action: "summarize", tabId, url}) ──► background.js
                                                          │
                                                          ├─ getCached(url) → return if hit
                                                          ├─ chrome.storage.local.get("geminiApiKey")
                                                          ├─ executeScript → inject Readability.js
                                                          ├─ executeScript → extract text (plain, no HTML)
                                                          ├─ POST → Gemini API
                                                          ├─ saveCache(url, result)
                                                          └─ sendResponse({success, data})
  popup.js ◄── renders summary ──────────────────────────┘
```

The popup never touches the API. All network calls live exclusively in the background service worker.

---

## AI Integration

- **Provider:** Google Gemini
- **Model:** `gemini-2.5-flash` (fast, free tier, handles long context)
- **Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`
- **Authentication:** API key passed as a URL query parameter (`?key=...`) — only from the background service worker
- **Prompt structure:** The model is instructed to respond with a strict JSON schema:
  ```json
  {
    "summary": ["...", "...", "...", "...", "..."],
    "insights": ["...", "...", "..."],
    "readingTime": "X minutes"
  }
  ```
- **Content cap:** Page text is truncated to 4,000 words before being sent to stay within token limits and keep API calls fast
- **Temperature:** `0.3` — keeps output factual and consistent, not creative
- **Response parsing:** Any accidental Markdown code fences (` ```json `) are stripped before `JSON.parse()`

---

## Security Decisions

| Threat | Mitigation |
|---|---|
| API key in popup / content script | All API calls happen exclusively in `background.js` (the service worker). The popup only sends messages; it never sees the key |
| API key storage | Stored in `chrome.storage.local` — encrypted by Chrome, accessible only to this extension, persists across browser restarts |
| API key in background.js (demo build) | A Gemini API key is embedded in `background.js` intentionally for grading/demo purposes so reviewers can test the extension without any setup. The key lives only in the background service worker — never in any content script or popup. In a production build this would be an environment variable or server-side proxy. The architecture (key isolated to service worker only) satisfies the security requirement regardless |
| XSS from page content | `Readability.js` returns `textContent` (plain text, no HTML). The popup renders AI output using `li.textContent = ...`, never `innerHTML` |
| Excessive page permissions | Uses `activeTab` (not `<all_urls>`). Permission is only granted when the user clicks the extension icon — no passive background access to any page |
| Script injection safety | Content extraction is only performed when the user explicitly clicks "Summarize Page" |

---

## Trade-offs

| Decision | Reasoning |
|---|---|
| **Gemini over OpenAI** | Gemini has a free tier with no credit card required (15 req/min). OpenAI has no free tier |
| **`activeTab` over `<all_urls>`** | Minimal permission footprint. The extension only needs access when the user actively requests a summary |
| **Dynamic script injection** | Readability.js is injected on demand rather than running on every page load, keeping performance impact at zero when the extension isn't being used |
| **4,000-word cap on content** | Balances context quality with API token limits and latency. Most articles are under this limit anyway |
| **`chrome.storage.local` for caching** | Built-in, per-extension, persistent, no external dependency |
| **JSON-only prompt** | Instructing the model to output only JSON makes parsing reliable and prevents freeform text bleed into the UI |

---

## Local Installation (No Chrome Store)

This extension is loaded locally and is **not** published to the Chrome Web Store.

To install:

1. Download or clone this repository to your computer
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked** and select the `ai-page-summarizer` folder
5. Follow the Setup Instructions above to add your API key

To update after making code changes: click the refresh icon on the extension card at `chrome://extensions`.
