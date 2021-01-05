const maxTabId = 'max-tabs-option';
const statusId = 'status';

function save_options() {
  const maxTabs = document.getElementById(maxTabId).value;
  if (maxTabs <= 0) return;
  chrome.storage.sync.set({
    maxTabs: maxTabs,
  }, function() {
    // Update status to let user know options were saved.
    var status = document.getElementById(statusId);
    status.textContent = 'Options saved.';
    setTimeout(function() {
      status.textContent = '';
    }, 750);
    chrome.extension.getBackgroundPage().window.location.reload();
  });
}

function restore_options() {
  chrome.storage.sync.get({
    maxTabs: 15,
  }, function(items) {
    document.getElementById(maxTabId).value = items.maxTabs;
  });
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);