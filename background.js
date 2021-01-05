class LRUSet {
  constructor(max = 30) {
    this.max = max;
    this.cache = new Map();
  }

  static from(keys, max = 30, onDelete = () => {}) {
    const lruset = new LRUSet(max);
    keys.forEach(key => {
      lruset.set(key, onDelete);
    });
    return lruset;
  }

  has(key) {
    const value = this.cache.get(key);
    if (value) {
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return !!value;
  }

  set(key, onDelete = () => {}) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size === this.max) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
      onDelete(firstKey);
    }
    this.cache.set(key, 'true');
  }

  delete(key) {
    this.cache.delete(key)
  }

  values() {
    return Array.from(this.cache.entries()).map(([k, v]) => k);
  }
}

async function existsTab(tabId) {
  return new Promise(resolve => {
    chrome.tabs.get(tabId, (tab) => {
      resolve(!!tab);
    })
  })
}

async function getCurrentTabId() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab) return resolve(tab.id);
      else return reject(new Error('cannot find current tab'))
    });
  })
}

async function canTabRemove(tabId) {
  return new Promise(resolve => {
    chrome.tabs.get(tabId, (tab) => {
      if (!tab) return resolve(false);
      resolve(!tab.audible); // 音がなってたら消せない
    })
  })
}

async function getMaxTabs() {
  return new Promise(resolve => {
    chrome.storage.sync.get({
      maxTabs: 15,
    }, function(items) {
      return resolve(parseInt(items.maxTabs));
    });
  });
}

function removeTab(tabId, n = 5) {
  if (n <= 0) return;
  chrome.tabs.remove(tabId, () =>{
    console.log('retry removeTab', tabId);
    setTimeout(() => {
      removeTab(tabId, n - 4);
    }, 1000);
  });
}

async function main() {
  const maxTabs = await getMaxTabs();
  console.log('max tabs', maxTabs);
  const lruTabs = new LRUSet(maxTabs);
  const stickTabs = new Set();
  const contextMenuId = 'lru-tab-closer-context-menu-id';

  const onUpdate = async (tabId) => {
    const exists = await existsTab(tabId);
    const canRemove = await canTabRemove(tabId);
    const isStick = stickTabs.has(tabId);
    if (!exists || isStick || !canRemove) {
      lruTabs.delete(tabId)
      return;
    }
    lruTabs.set(tabId, (willDeleteTabId) => {
      console.log('will remove', willDeleteTabId);
      removeTab(willDeleteTabId);
    });
  }

  const onDelete = (tabId) => {
    lruTabs.delete(tabId);
    stickTabs.delete(tabId);
  }

  const onClickStick = async () => {
    try {
      const currentTabId = await getCurrentTabId();
      const isStick = stickTabs.has(currentTabId);
      if (isStick) {
        console.log('unstick', currentTabId);
        stickTabs.delete(currentTabId);
      } else {
        console.log('stick', currentTabId);
        stickTabs.add(currentTabId);
      }
      await updateContextMenu();
    } catch(e) {
      console.error(e);
    }
  }

  const updateContextMenu = async () => {
    try {
      const currentTabId = await getCurrentTabId();
      const isStick = stickTabs.has(currentTabId);
      chrome.contextMenus.update(contextMenuId, 
      {
        title: `${isStick ? '✓ ' : ''}Preserve This Page - LRU Tab Closer`,
      });
    } catch(e) {
      console.error(e);
    }
  }

  try {
    await new Promise(resolve => chrome.contextMenus.remove(contextMenuId, resolve));
    chrome.contextMenus.create({
      id: contextMenuId,
      title: "Preserve This Page - LRU Tab Closer",
      contexts: ["page", "page_action"],  // ContextType
      visible: true,
      onclick: onClickStick // A callback function
    });
  } catch(e) {
    console.log(e);
  }

  chrome.tabs.onCreated.addListener(function(tab) {
    const tabId = tab.id;
    console.log('create', tabId);
    onUpdate(tabId);
    updateContextMenu();
  });

  chrome.tabs.onActivated.addListener(function(tab) {
    const tabId = tab.tabId;
    console.log('activate', tabId);
    onUpdate(tabId);
    updateContextMenu();
  });

  chrome.tabs.onRemoved.addListener(function(tabId) {
    console.log('remove', tabId);
    onDelete(tabId);
    updateContextMenu();
  });
}

main().catch(e => {
  console.error(e);
});