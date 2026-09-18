// Tab Commander — background service worker
// Maintains a live in-memory index of every open tab across all windows,
// persists it to chrome.storage.local, and broadcasts changes to the
// dashboard page via chrome.runtime messaging.

const tabIndex = new Map();

function toRecord(tab, existing, touch) {
  return {
    id: tab.id,
    windowId: tab.windowId,
    title: tab.title || existing?.title || tab.url || "(untitled tab)",
    url: tab.url || existing?.url || "",
    favIconUrl: tab.favIconUrl || existing?.favIconUrl || "",
    lastAccessed: touch ? Date.now() : existing?.lastAccessed ?? Date.now(),
  };
}

function upsertTab(tab, { touch = false } = {}) {
  if (tab.id == null) return;
  const existing = tabIndex.get(tab.id);
  tabIndex.set(tab.id, toRecord(tab, existing, touch));
}

function snapshot() {
  return Array.from(tabIndex.values()).sort(
    (a, b) => a.windowId - b.windowId || a.id - b.id
  );
}

async function persistAndBroadcast() {
  const tabs = snapshot();
  await chrome.storage.local.set({ tabs });
  chrome.runtime.sendMessage({ type: "TABS_UPDATED", tabs }).catch(() => {
    // No dashboard listening right now — that's fine, storage still has it.
  });
}

async function rebuildIndex() {
  tabIndex.clear();
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) upsertTab(tab, { touch: true });
  await persistAndBroadcast();
}

chrome.runtime.onInstalled.addListener(rebuildIndex);
chrome.runtime.onStartup.addListener(rebuildIndex);
rebuildIndex();

chrome.tabs.onCreated.addListener((tab) => {
  upsertTab(tab, { touch: true });
  persistAndBroadcast();
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabIndex.delete(tabId);
  persistAndBroadcast();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  upsertTab(tab);
  persistAndBroadcast();
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  const existing = tabIndex.get(tabId);
  if (existing) {
    existing.lastAccessed = Date.now();
    persistAndBroadcast();
  } else {
    chrome.tabs
      .get(tabId)
      .then((tab) => {
        upsertTab(tab, { touch: true });
        return persistAndBroadcast();
      })
      .catch(() => {});
  }
});

chrome.tabs.onAttached.addListener((tabId, attachInfo) => {
  const existing = tabIndex.get(tabId);
  if (existing) {
    existing.windowId = attachInfo.newWindowId;
    persistAndBroadcast();
  }
});

chrome.tabs.onReplaced.addListener((addedTabId, removedTabId) => {
  tabIndex.delete(removedTabId);
  chrome.tabs
    .get(addedTabId)
    .then((tab) => {
      upsertTab(tab, { touch: true });
      return persistAndBroadcast();
    })
    .catch(() => {});
});

chrome.windows.onRemoved.addListener(() => {
  // A whole window closing fires onRemoved for each of its tabs too,
  // but this keeps the index tidy in case any stragglers remain.
  persistAndBroadcast();
});

async function openDashboard() {
  const dashboardUrl = chrome.runtime.getURL("dashboard.html");
  const [existing] = await chrome.tabs.query({ url: dashboardUrl });
  if (existing) {
    await chrome.tabs.update(existing.id, { active: true });
    await chrome.windows.update(existing.windowId, { focused: true });
  } else {
    await chrome.tabs.create({ url: dashboardUrl });
  }
}

chrome.action.onClicked.addListener(openDashboard);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== "object") return false;

  if (message.type === "GET_TABS") {
    sendResponse({ tabs: snapshot() });
    return true;
  }

  if (message.type === "CLOSE_TABS") {
    const ids = Array.isArray(message.tabIds) ? message.tabIds : [];
    if (ids.length === 0) {
      sendResponse({ ok: true, closed: 0 });
      return true;
    }
    chrome.tabs
      .remove(ids)
      .then(() => sendResponse({ ok: true, closed: ids.length }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  return false;
});
