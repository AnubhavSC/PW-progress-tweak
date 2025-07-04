console.log('PW Live Navigation Helper active on this page');

let hideProgressBar = true;
let adjustTimeDisplay = false;
let progressBarObserver = null;
let originalProgressBar = null;
let progressBarContainer = null;
let timeAdjustmentInterval = null;
let timeOverlay = null;
let originalCurrentTimeEl = null;

chrome.storage.local.get(['hideProgressBar', 'adjustTimeDisplay'], function(result) {
  hideProgressBar = result.hideProgressBar !== undefined ? result.hideProgressBar : true;
  adjustTimeDisplay = result.adjustTimeDisplay || false;

  startProgressBarMonitoring();

  if (adjustTimeDisplay) {
    setTimeout(startAdjustedTimeDisplay, 1500);
  }
});

function startProgressBarMonitoring() {
  handleExistingProgressBar();

  if (!progressBarObserver) {
    progressBarObserver = new MutationObserver(() => {
      if (!document.querySelector('[aria-label="Progress Bar"]') && hideProgressBar) {
        handleExistingProgressBar();
      }
    });

    progressBarObserver.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    console.log('Progress bar observer started');
  }
}

function handleExistingProgressBar() {
  const progressBar = document.querySelector('[aria-label="Progress Bar"]');
  if (progressBar) {
    console.log('Progress bar found');
    if (!originalProgressBar) {
      originalProgressBar = progressBar.cloneNode(true);
      progressBarContainer = progressBar.parentNode;
    }
    if (hideProgressBar) {
      progressBar.style.display = 'none';
    } else {
      progressBar.style.display = '';
    }
    return true;
  }
  return false;
}

function toggleProgressBar(hide) {
  hideProgressBar = hide;
  const progressBar = document.querySelector('[aria-label="Progress Bar"]');
  if (progressBar) {
    progressBar.style.display = hide ? 'none' : '';
    return true;
  } else if (!hide && originalProgressBar && progressBarContainer) {
    try {
      const newProgressBar = originalProgressBar.cloneNode(true);
      newProgressBar.style.display = '';
      progressBarContainer.appendChild(newProgressBar);
      return true;
    } catch (e) {
      console.error('Failed to restore progress bar:', e);
    }
  }
  return false;
}

function jumpToTime(seconds) {
  const videoElements = document.querySelectorAll('video');
  let videoHandled = false;

  videoElements.forEach(video => {
    if (video && typeof video.currentTime !== 'undefined') {
      try {
        if (video.duration && seconds > video.duration) {
          seconds = Math.max(0, video.duration - 1);
        }
        video.currentTime = seconds;
        videoHandled = true;
      } catch (e) {
        console.error('Error setting video time:', e);
      }
    }
  });

  return videoHandled;
}

function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return (h > 0 ? `${h}:` : '') + `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function createTimeOverlay() {
  if (timeOverlay) {
    timeOverlay.remove();
    timeOverlay = null;
  }

  const currentTimeEl = document.querySelector('.vjs-current-time-display');
  if (!currentTimeEl) return null;

  originalCurrentTimeEl = currentTimeEl;

  timeOverlay = document.createElement('div');
  timeOverlay.id = 'pw-time-overlay';
  timeOverlay.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 50;
    background: transparent;
    color: inherit;
    font-family: inherit;
    font-size: inherit;
    font-weight: inherit;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    padding: 0;
    margin: 0;
    pointer-events: none;
  `;

  const parentContainer = currentTimeEl.closest('.vjs-current-time') || currentTimeEl.parentElement;
  if (parentContainer) {
    parentContainer.style.position = 'relative';
    parentContainer.appendChild(timeOverlay);
    
    currentTimeEl.style.opacity = '0';
    
    return timeOverlay;
  }
  
  return null;
}

function removeTimeOverlay() {
  if (timeOverlay) {
    timeOverlay.remove();
    timeOverlay = null;
  }
  
  if (originalCurrentTimeEl) {
    originalCurrentTimeEl.style.opacity = '1';
  }
}

function startAdjustedTimeDisplay() {
  if (timeAdjustmentInterval) clearInterval(timeAdjustmentInterval);

  const video = document.querySelector('video');
  const durationEl = document.querySelector('.vjs-duration-display');

  if (!video || !durationEl) {
    console.log('Video or duration element not found, retrying...');
    setTimeout(startAdjustedTimeDisplay, 1000);
    return;
  }

  const overlay = createTimeOverlay();
  if (!overlay) {
    console.log('Failed to create time overlay, retrying...');
    setTimeout(startAdjustedTimeDisplay, 1000);
    return;
  }

  function updateTimeDisplay() {
    try {
      const rate = video.playbackRate || 1;
      const adjustedCurrent = video.currentTime / rate;
      const adjustedDuration = video.duration / rate;

      if (!isNaN(adjustedCurrent) && overlay) {
        overlay.textContent = formatTime(adjustedCurrent);
      }

      if (!isNaN(adjustedDuration) && rate !== 1) {
        durationEl.textContent = formatTime(adjustedDuration);
      }
    } catch (e) {
      console.error('Error updating time display:', e);
    }
  }

  updateTimeDisplay();

  timeAdjustmentInterval = setInterval(updateTimeDisplay, 500);

  console.log('Adjusted time display with overlay started');
}

function stopAdjustedTimeDisplay() {
  if (timeAdjustmentInterval) {
    clearInterval(timeAdjustmentInterval);
    timeAdjustmentInterval = null;
  }

  removeTimeOverlay();

  const video = document.querySelector('video');
  const durationEl = document.querySelector('.vjs-duration-display');

  if (video && durationEl) {
    if (!isNaN(video.duration)) {
      durationEl.textContent = formatTime(video.duration);
    }
  }

  console.log('Adjusted time display stopped and overlay removed');
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "jumpToTime") {
    const result = jumpToTime(request.time);
    sendResponse({ success: result });
  } else if (request.action === "setProgressBarVisibility") {
    const result = toggleProgressBar(request.hide);
    chrome.storage.local.set({ hideProgressBar: request.hide });
    sendResponse({ success: result });
  } else if (request.action === "setTimeAdjustment") {
    adjustTimeDisplay = request.enabled;
    chrome.storage.local.set({ adjustTimeDisplay: request.enabled });
    if (adjustTimeDisplay) {
      startAdjustedTimeDisplay();
    } else {
      stopAdjustedTimeDisplay();
    }
    sendResponse({ success: true });
  }
  return true;
});

let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    originalProgressBar = null;
    progressBarContainer = null;
    
    if (timeAdjustmentInterval) {
      clearInterval(timeAdjustmentInterval);
      timeAdjustmentInterval = null;
    }
    
    removeTimeOverlay();
    
    setTimeout(() => {
      handleExistingProgressBar();
      if (adjustTimeDisplay) {
        startAdjustedTimeDisplay();
      }
    }, 1000);
  }
}).observe(document, {subtree: true, childList: true});

handleExistingProgressBar();