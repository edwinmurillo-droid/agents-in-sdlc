// Tab Commander — dashboard logic
// Renders the live tab index, handles search/multi-select/close actions,
// and drives the voice-command mode via the Web Speech API.

const state = {
  tabs: [],
  selected: new Set(),
  query: "",
  ownTabId: null,
};

const el = {
  windows: document.getElementById("windows"),
  emptyState: document.getElementById("emptyState"),
  search: document.getElementById("search"),
  clearSearch: document.getElementById("clearSearch"),
  tabCount: document.getElementById("tabCount"),
  closeSelected: document.getElementById("closeSelected"),
  closeMatching: document.getElementById("closeMatching"),
  selectedCount: document.getElementById("selectedCount"),
  mic: document.getElementById("mic"),
  voicePanel: document.getElementById("voicePanel"),
  voiceStatus: document.getElementById("voiceStatus"),
  voiceTranscript: document.getElementById("voiceTranscript"),
  voiceStop: document.getElementById("voiceStop"),
  confirmPanel: document.getElementById("confirmPanel"),
  confirmText: document.getElementById("confirmText"),
  confirmYes: document.getElementById("confirmYes"),
  confirmNo: document.getElementById("confirmNo"),
};

const DEFAULT_FAVICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Crect width='16' height='16' rx='3' fill='%233a3f4d'/%3E%3C/svg%3E";

// ---------- data loading & live updates ----------

function requestTabs() {
  chrome.runtime.sendMessage({ type: "GET_TABS" }, (response) => {
    if (chrome.runtime.lastError) return;
    if (response?.tabs) setTabs(response.tabs);
  });
}

function setTabs(tabs) {
  state.tabs = tabs;
  const liveIds = new Set(tabs.map((t) => t.id));
  for (const id of state.selected) {
    if (!liveIds.has(id)) state.selected.delete(id);
  }
  render();
}

chrome.storage.local.get("tabs", (result) => {
  if (result?.tabs) setTabs(result.tabs);
  requestTabs(); // authoritative refresh
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "TABS_UPDATED" && Array.isArray(message.tabs)) {
    setTabs(message.tabs);
  }
});

if (chrome.tabs?.getCurrent) {
  chrome.tabs.getCurrent((tab) => {
    if (tab) state.ownTabId = tab.id;
  });
}

// ---------- filtering ----------

function matchesQuery(tab, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    tab.title.toLowerCase().includes(q) || tab.url.toLowerCase().includes(q)
  );
}

function getFilteredTabs() {
  return state.tabs.filter((t) => matchesQuery(t, state.query));
}

// ---------- rendering ----------

function formatRelativeTime(ts) {
  if (!ts) return "";
  const diffMs = Date.now() - ts;
  const sec = Math.round(diffMs / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}

function highlight(text, query) {
  if (!query) return document.createTextNode(text);
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return document.createTextNode(text);
  const frag = document.createDocumentFragment();
  frag.appendChild(document.createTextNode(text.slice(0, idx)));
  const mark = document.createElement("mark");
  mark.textContent = text.slice(idx, idx + query.length);
  frag.appendChild(mark);
  frag.appendChild(document.createTextNode(text.slice(idx + query.length)));
  return frag;
}

function buildTabRow(tab) {
  const row = document.createElement("div");
  row.className = "tab-row";
  row.dataset.tabId = String(tab.id);
  if (state.selected.has(tab.id)) row.classList.add("selected");

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = state.selected.has(tab.id);
  checkbox.addEventListener("change", () => {
    if (checkbox.checked) state.selected.add(tab.id);
    else state.selected.delete(tab.id);
    row.classList.toggle("selected", checkbox.checked);
    updateActionBar();
  });

  const favicon = document.createElement("img");
  favicon.className = "favicon";
  favicon.src = tab.favIconUrl || DEFAULT_FAVICON;
  favicon.addEventListener("error", () => {
    favicon.src = DEFAULT_FAVICON;
  });

  const info = document.createElement("div");
  info.className = "tab-info";
  const title = document.createElement("div");
  title.className = "tab-title";
  title.title = tab.title;
  title.appendChild(highlight(tab.title, state.query));
  const url = document.createElement("div");
  url.className = "tab-url";
  url.title = tab.url;
  url.appendChild(highlight(tab.url, state.query));
  info.append(title, url);
  info.addEventListener("click", () => {
    chrome.tabs.update(tab.id, { active: true });
    chrome.windows.update(tab.windowId, { focused: true });
  });
  info.style.cursor = "pointer";

  const lastAccessed = document.createElement("div");
  lastAccessed.className = "tab-last-accessed";
  lastAccessed.textContent = formatRelativeTime(tab.lastAccessed);

  const closeBtn = document.createElement("button");
  closeBtn.className = "tab-close";
  closeBtn.textContent = "×";
  closeBtn.title = "Close tab";
  closeBtn.addEventListener("click", () => closeTabs([tab.id]));

  row.append(checkbox, favicon, info, lastAccessed, closeBtn);
  return row;
}

function render() {
  const filtered = getFilteredTabs();
  el.windows.innerHTML = "";
  el.emptyState.hidden = filtered.length > 0;

  const byWindow = new Map();
  for (const tab of filtered) {
    if (!byWindow.has(tab.windowId)) byWindow.set(tab.windowId, []);
    byWindow.get(tab.windowId).push(tab);
  }

  for (const [windowId, tabs] of [...byWindow.entries()].sort(
    (a, b) => a[0] - b[0]
  )) {
    const group = document.createElement("section");
    group.className = "window-group";

    const header = document.createElement("div");
    header.className = "window-header";
    const selectAll = document.createElement("input");
    selectAll.type = "checkbox";
    const allSelected = tabs.every((t) => state.selected.has(t.id));
    selectAll.checked = allSelected;
    selectAll.addEventListener("change", () => {
      for (const t of tabs) {
        if (selectAll.checked) state.selected.add(t.id);
        else state.selected.delete(t.id);
      }
      render();
    });
    const label = document.createElement("span");
    label.innerHTML = `Window <strong>${windowId}</strong> &middot; ${tabs.length} tab${
      tabs.length === 1 ? "" : "s"
    }`;
    header.append(selectAll, label);
    group.appendChild(header);

    for (const tab of tabs) group.appendChild(buildTabRow(tab));
    el.windows.appendChild(group);
  }

  el.tabCount.textContent = `${state.tabs.length} tab${
    state.tabs.length === 1 ? "" : "s"
  } open`;
  updateActionBar();
}

function updateActionBar() {
  const filteredCount = getFilteredTabs().length;
  el.selectedCount.textContent = String(state.selected.size);
  el.closeSelected.disabled = state.selected.size === 0;
  el.closeMatching.disabled = filteredCount === 0;
  el.closeMatching.textContent = state.query
    ? `Close all matching (${filteredCount})`
    : `Close all matching`;
}

// ---------- closing tabs ----------

function closeTabs(tabIds) {
  const ids = tabIds.filter((id) => id !== state.ownTabId);
  if (ids.length === 0) return;
  chrome.runtime.sendMessage({ type: "CLOSE_TABS", tabIds: ids }, () => {
    for (const id of ids) state.selected.delete(id);
  });
}

function confirmAndClose(tabIds, description) {
  const ids = tabIds.filter((id) => id !== state.ownTabId);
  if (ids.length === 0) return;
  if (ids.length > 3) {
    showConfirm(
      `Close ${ids.length} tabs (${description})?`,
      () => closeTabs(ids)
    );
  } else {
    closeTabs(ids);
  }
}

function showConfirm(text, onYes) {
  el.confirmText.textContent = text;
  el.confirmPanel.hidden = false;
  const cleanup = () => {
    el.confirmPanel.hidden = true;
    el.confirmYes.removeEventListener("click", yesHandler);
    el.confirmNo.removeEventListener("click", noHandler);
  };
  const yesHandler = () => {
    cleanup();
    onYes();
  };
  const noHandler = () => cleanup();
  el.confirmYes.addEventListener("click", yesHandler);
  el.confirmNo.addEventListener("click", noHandler);
}

// ---------- toolbar events ----------

el.search.addEventListener("input", () => {
  state.query = el.search.value.trim();
  el.clearSearch.hidden = state.query.length === 0;
  render();
});

el.clearSearch.addEventListener("click", () => {
  el.search.value = "";
  state.query = "";
  el.clearSearch.hidden = true;
  render();
});

el.closeSelected.addEventListener("click", () => {
  confirmAndClose([...state.selected], "selected");
});

el.closeMatching.addEventListener("click", () => {
  const ids = getFilteredTabs().map((t) => t.id);
  confirmAndClose(ids, state.query ? `matching "${state.query}"` : "all tabs");
});

// ---------- voice command mode ----------

const SpeechRecognitionImpl =
  window.SpeechRecognition || window.webkitSpeechRecognition;

let recognizer = null;
let recognizing = false;

function parseVoiceCommand(rawText) {
  const text = rawText.trim().toLowerCase();

  if (/\b(this|current) window\b/.test(text)) {
    return { action: "closeWindow" };
  }

  let match = text.match(/close(?: all)? tabs?\s+matching\s+(.+)/);
  if (match) return { action: "closeMatching", query: match[1].trim() };

  match = text.match(/close(?: all)? (.+?) tabs?\b/);
  if (match) return { action: "closeMatching", query: match[1].trim() };

  match = text.match(/close\s+(.+)/);
  if (match) return { action: "closeMatching", query: match[1].trim() };

  return { action: "unknown" };
}

function runVoiceCommand(command) {
  if (command.action === "closeWindow") {
    const targetWindow = state.ownTabId
      ? state.tabs.find((t) => t.id === state.ownTabId)?.windowId
      : undefined;
    const ids = state.tabs
      .filter((t) => t.windowId === targetWindow)
      .map((t) => t.id);
    confirmAndClose(ids, "this window's tabs");
    return;
  }

  if (command.action === "closeMatching") {
    state.query = command.query;
    el.search.value = command.query;
    el.clearSearch.hidden = command.query.length === 0;
    render();
    const ids = getFilteredTabs().map((t) => t.id);
    if (ids.length === 0) {
      el.voiceStatus.textContent = `No tabs match "${command.query}".`;
      return;
    }
    confirmAndClose(ids, `matching "${command.query}"`);
    return;
  }

  el.voiceStatus.textContent = "Sorry, I didn't understand that command.";
}

function startVoiceMode() {
  if (!SpeechRecognitionImpl) {
    alert("Voice commands need Chrome's Web Speech API, which isn't available here.");
    return;
  }
  if (recognizing) {
    stopVoiceMode();
    return;
  }

  recognizer = new SpeechRecognitionImpl();
  recognizer.lang = "en-US";
  recognizer.continuous = false;
  recognizer.interimResults = true;

  el.voicePanel.hidden = false;
  el.voiceStatus.textContent = "Listening…";
  el.voiceTranscript.textContent = "";
  el.mic.classList.add("recording");
  recognizing = true;

  recognizer.onresult = (event) => {
    let transcript = "";
    let isFinal = false;
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
      if (event.results[i].isFinal) isFinal = true;
    }
    el.voiceTranscript.textContent = transcript;
    if (isFinal) {
      el.voiceStatus.textContent = "Got it — processing…";
      runVoiceCommand(transcript);
    }
  };

  recognizer.onerror = (event) => {
    el.voiceStatus.textContent = `Mic error: ${event.error}`;
  };

  recognizer.onend = () => {
    recognizing = false;
    el.mic.classList.remove("recording");
    el.voiceStatus.textContent = "Stopped listening.";
  };

  recognizer.start();
}

function stopVoiceMode() {
  if (recognizer && recognizing) recognizer.stop();
}

el.mic.addEventListener("click", startVoiceMode);
el.voiceStop.addEventListener("click", () => {
  stopVoiceMode();
  el.voicePanel.hidden = true;
});

// ---------- periodic re-render for relative timestamps ----------

setInterval(() => {
  if (state.tabs.length) render();
}, 30000);
