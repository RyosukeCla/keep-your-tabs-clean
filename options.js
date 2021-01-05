const maxTabId = 'max-tabs-option';
const expiredAfterId = 'expired-after-option';
const statusId = 'status';

function save_options() {
  const maxTabs = document.getElementById(maxTabId).value;
  const expiredAfter = document.getElementById(expiredAfterId).value;
  if (maxTabs <= 0) return;
  if (expiredAfter < 0) return;
  chrome.storage.sync.set({
    maxTabs: maxTabs,
    expiredAfter: expiredAfter,
  }, function() {
    // Update status to let user know options were saved.
    var status = document.getElementById(statusId);
    status.textContent = 'Saved.';
    setTimeout(function() {
      status.textContent = '';
    }, 750);
    chrome.extension.getBackgroundPage().window.location.reload();
  });
}

function restore_options() {
  chrome.storage.sync.get({
    maxTabs: 15,
    expiredAfter: 15,
  }, function(items) {
    document.getElementById(maxTabId).value = items.maxTabs;
    document.getElementById(expiredAfterId).value = items.expiredAfter;
  });
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);