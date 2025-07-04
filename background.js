chrome.runtime.onInstalled.addListener(() => {
  console.log('PW Live Navigation Helper installed');
  
  chrome.storage.local.get(['hideProgressBar'], function(result) {
    if (result.hideProgressBar === undefined) {
      chrome.storage.local.set({hideProgressBar: true});
    }
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('pw.live/watch')) {
    setTimeout(() => {
      chrome.storage.local.get(['hideProgressBar'], function(result) {
        const hideProgressBar = result.hideProgressBar !== undefined ? result.hideProgressBar : true;
        
        chrome.tabs.sendMessage(tabId, {
          action: "setProgressBarVisibility",
          hide: hideProgressBar
        });
      });
    }, 1500);
  }
});