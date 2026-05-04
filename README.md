# AI Page Summarizer

A Chrome Extension built with Manifest V3 that summarizes any webpage using the Gemini AI API. Click the icon, hit Summarize, and get a bullet-point breakdown of the page in seconds.

## What it does

- Extracts the main content from the page (ignores navbars, ads, sidebars) using Mozilla Readability
- Sends the text to Gemini AI and gets back a structured summary
- Shows 5 bullet points, 3 key insights, and an estimated reading time
- Caches results per URL so clicking on the same page twice is instant

## How to install

1. Clone or download this repo
2. Open Chrome and go to `chrome://extensions`
3. Turn on **Developer mode** (top right toggle)
4. Click **Load unpacked** and select the `ai-page-summarizer` folder
5. Pin the extension from the puzzle piece icon in the toolbar

The extension comes pre-configured so it works immediately after loading — no API key setup needed.

## How to use

1. Open any article or blog post
2. Click the AI Summarizer icon in your toolbar
3. Click **Summarize Page**
4. The summary appears in a few seconds

> Won't work on `chrome://` pages or the Chrome Web Store — Chrome doesn't allow extensions to inject scripts there.

## Project structure

```
ai-page-summarizer/
├── manifest.json       
├── background.js       service worker, handles all API calls
├── popup/
│   ├── popup.html      
│   ├── popup.js        
│   └── popup.css       
├── options/
│   ├── options.html    settings page for API key management
│   ├── options.js      
│   └── options.css     
├── lib/
│   └── Readability.js  Mozilla's readability parser
└── icons/
```

## How the AI integration works

The extension uses the **Gemini 2.5 Flash** model via the Generative Language API. When you click Summarize:

1. The background service worker injects Readability.js into the active tab
2. It extracts clean plain text (up to 4000 words) from the page
3. That text gets sent to Gemini with a prompt asking for JSON output in a specific shape
4. The response gets parsed and rendered in the popup

The prompt forces Gemini to return only valid JSON with `summary`, `insights`, and `readingTime` fields. Temperature is set to 0.3 to keep the output consistent.

## Security

The API key lives only in `background.js` (the service worker) and is seeded into `chrome.storage.local` on install. The popup and content scripts never touch the key directly — all API calls go through the background worker. Page content is extracted as plain text using `textContent`, never `innerHTML`, so there's no risk of injecting anything malicious into the popup.

The extension uses `activeTab` instead of broad host permissions, so it only gets access to a tab when the user explicitly clicks the icon.

For this demo build, the API key is embedded directly so reviewers don't need to configure anything. In a real deployment it would live in a server-side proxy or environment variable.

## Trade-offs

**Gemini over OpenAI** — Gemini has a genuinely free tier, OpenAI doesn't. Easy choice for a personal project.

**Dynamic script injection** — Readability.js only gets injected when you click Summarize. It doesn't run on every page load, so there's zero performance impact when you're not using the extension.

**4000 word cap** — Most articles fall under this anyway, and it keeps API latency low and token usage reasonable.

**chrome.storage for caching** — No external dependencies, it's built into the extension platform and works fine for this use case.

## Local installation note

This extension is not on the Chrome Web Store. To use it, load it unpacked as described above. To apply any code changes, just hit the refresh icon on the extension card at `chrome://extensions`.
