# Skip to the Good Part — YT Music Timestamp Navigator

A Chrome extension for YouTube Music that lets you bookmark your favorite moments in a song and jump straight to them — no more manually dragging the seek bar every time you want to hear that one part.

## Why

A lot of songs only have one or two parts you actually love. This extension lets you mark those spots once, then skip to them instantly — via a popup UI or keyboard shortcuts — instead of scrubbing through the timeline every time.

## Features

- **Bookmark the current playback position** with one click or `Alt+S`
- **Jump to the next saved part** (wraps to the first if you're past the last one) with one click or `Alt+J`
- **Per-song timestamp list** — view, play, or delete individual saved points from the popup
- **Duplicate detection** — won't save near-identical timestamps (within 0.5s)
- **Keyboard shortcuts work anywhere** on the page — no need to open the popup

## How it works

The interesting part of this project wasn't the UI — it was getting a reliable, unique identifier for the currently playing song.

YouTube Music exposes a `getVideoData()` method on its player element, which returns a real, stable video ID. The problem: Chrome extension content scripts run in an **isolated JavaScript world** — they share the page's DOM, but not the JavaScript objects the page itself attaches to DOM elements. `getVideoData()` is one of those — visible and callable from the browser's own console, but invisible to a content script running in the isolated world, even though both are "looking at" the same DOM element.

**The fix:** two content scripts, injected into two different execution contexts, talking to each other:

- `main-world-script.js` runs with `"world": "MAIN"` in the manifest, giving it access to YouTube's real player object and `getVideoData()`. It polls for the current video ID and, whenever it changes, sends it out with `window.postMessage`.
- `content-script.js` runs in the default isolated world, where `chrome.storage.local` is available. It listens for that `postMessage`, and uses the ID to key all reads/writes to storage.

This is also why main-world scripts can't just do everything themselves — extension APIs like `chrome.storage` are deliberately blocked from the main world, since main-world scripts are treated the same as any other page script for security reasons. The isolation goes both ways.

┌─────────────────────┐ postMessage ┌──────────────────────┐
│ main-world-script.js │ ───────────────────> │ content-script.js │
│ (MAIN world) │ { videoId } │ (isolated world) │
│ getVideoData() │ │ chrome.storage.local│
└─────────────────────┘ └──────────┬───────────┘
│ chrome.runtime
│ .onMessage
┌──────────▼───────────┐
│ popup.js │
│ (popup UI, buttons) │
└───────────────────────┘


## Tech stack

Vanilla JavaScript, Chrome Extension Manifest V3 APIs (`chrome.storage.local`, `chrome.runtime.onMessage`, `chrome.tabs.sendMessage`, multi-world content script injection), HTML/CSS for the popup.

## Installation (load unpacked)

This extension isn't on the Chrome Web Store (yet). To try it:

1. Clone or download this repository
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** and select this project's folder
5. Open [music.youtube.com](https://music.youtube.com), play a song, and try `Alt+S` to save a timestamp, `Alt+J` to jump

## Project structure

├── manifest.json # Extension config, permissions, content script registration
├── content-script.js # Isolated-world script: storage, keyboard shortcuts, popup messaging
├── main-world-script.js # Main-world script: polls and reports the current video ID
├── popup.html / popup.js # Popup UI: add/jump/edit timestamps
├── popup.css # Popup styling
├── styles.css # In-page confirmation toast styling
└── icons/ # Extension icons


## What I'd build next

- A proper video ID lookup that doesn't rely on polling (listening for YT Music's own navigation events, if they prove reliable across song changes)
- Publishing to the Chrome Web Store
- Syncing saved timestamps across devices (currently local-only via `chrome.storage.local`)
