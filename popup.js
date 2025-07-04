document.addEventListener('DOMContentLoaded', function() {
  const minutesInput = document.getElementById('minutes');
  const secondsInput = document.getElementById('seconds');
  const goToTimeButton = document.getElementById('goToTime');
  const progressBarToggle = document.getElementById('progressBarToggle');
  const adjustTimeToggle = document.getElementById('adjustTimeToggle');
  const statusElement = document.getElementById('status');

  chrome.storage.local.get(['hideProgressBar', 'adjustTimeDisplay'], function(result) {
    const hideProgressBar = result.hideProgressBar !== undefined ? result.hideProgressBar : true;
    const adjustTime = result.adjustTimeDisplay || false;

    progressBarToggle.checked = hideProgressBar;
    adjustTimeToggle.checked = adjustTime;
    updateStatusText(hideProgressBar);

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0] && tabs[0].url.includes('pw.live/watch')) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "setProgressBarVisibility",
          hide: hideProgressBar
        });
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "setTimeAdjustment",
          enabled: adjustTime
        });
      }
    });
  });

  function updateStatusText(hideProgressBar) {
    if (hideProgressBar) {
      statusElement.textContent = 'Progress bar is hidden';
      statusElement.className = 'status hidden';
    } else {
      statusElement.textContent = 'Progress bar is visible';
      statusElement.className = 'status visible';
    }
  }

  secondsInput.addEventListener('change', function() {
    if (this.value > 59) this.value = 59;
    if (this.value < 0) this.value = 0;
  });

  minutesInput.addEventListener('change', function() {
    if (this.value < 0) this.value = 0;
  });

  progressBarToggle.addEventListener('change', function() {
    const hideProgressBar = this.checked;
    updateStatusText(hideProgressBar);
    chrome.storage.local.set({hideProgressBar: hideProgressBar});
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0] && tabs[0].url.includes('pw.live/watch')) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "setProgressBarVisibility",
          hide: hideProgressBar
        });
      }
    });
  });

  adjustTimeToggle.addEventListener('change', function() {
    const enabled = this.checked;
    chrome.storage.local.set({ adjustTimeDisplay: enabled });
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0] && tabs[0].url.includes('pw.live/watch')) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "setTimeAdjustment",
          enabled: enabled
        });
      }
    });
  });

  goToTimeButton.addEventListener('click', function() {
    const minutes = parseInt(minutesInput.value) || 0;
    const seconds = parseInt(secondsInput.value) || 0;
    const totalSeconds = (minutes * 60) + seconds;

    goToTimeButton.textContent = 'Jumping...';
    goToTimeButton.disabled = true;

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0] && tabs[0].url.includes('pw.live/watch')) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "jumpToTime",
          time: totalSeconds
        }, function() {
          setTimeout(() => {
            goToTimeButton.textContent = 'Go to Timestamp';
            goToTimeButton.disabled = false;
          }, 500);
        });
      } else {
        setTimeout(() => {
          goToTimeButton.textContent = 'Go to Timestamp';
          goToTimeButton.disabled = false;
        }, 500);
      }
    });
  });
});
