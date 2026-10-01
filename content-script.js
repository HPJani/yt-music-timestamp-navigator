console.log("YT Music extension loaded");

let currentVideoId = null;
const confMessage = document.createElement('div');
confMessage.id = 'yt-timestamp-conf-message';
document.body.appendChild(confMessage);

window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (event.data?.type === 'YT_MUSIC_VIDEO_ID') {
    currentVideoId = event.data.videoId;
    console.log('Got video ID from main world:', currentVideoId);
  }
});

function showConfMessage(message) {
  console.log("showConfMessage called with:", message);
  confMessage.textContent = message;
  confMessage.classList.add('visible');

  setTimeout(() => {
    confMessage.classList.remove('visible');
  }, 2000);
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

async function saveTimestamp() {
  if (!currentVideoId) {
    console.log("No song detected yet, try again in a moment");
    showConfMessage("No song detected yet, try again in a moment");
    return { success: false, error: 'no-video-id' };
  }

  const videoId = currentVideoId;
  const time = document.querySelector('video').currentTime;

  const result = await chrome.storage.local.get([videoId]);
  const existing = result[videoId] || [];

  const isDuplicate = existing.some((t) => Math.abs(t - time) < 0.5);
  if (isDuplicate) {
    showConfMessage("Timestamp already saved near this point");
    return { success: false, error: 'duplicate' };
  }
  existing.push(time);
  await chrome.storage.local.set({ [videoId]: existing });

  const formattedTime = formatTime(time);
  showConfMessage(`Timestamp saved at ${formattedTime}`);
  console.log(`Saved timestamp ${time.toFixed(1)}s for ${videoId}`);

  return { success: true, time };
}


async function jumpToSavedPart() {
  if (!currentVideoId) {
    console.log("No song detected yet, try again in a moment");
    showConfMessage("No song detected yet, try again in a moment");
    return { success: false, error: 'no-video-id' };
  }

  const result = await chrome.storage.local.get([currentVideoId]);
  const timestamps = result[currentVideoId] || [];

  if (timestamps.length === 0) {
    console.log("No saved timestamps for this song");
    showConfMessage("No saved timestamps for this song");
    return { success: false, error: 'no-timestamps' };
  }

  const sortedTimestamps = [...timestamps].sort((a, b) => a - b);
  const video = document.querySelector('video');
  const currentTime = video.currentTime;

  let targetTime = sortedTimestamps[0];

  for (let i = 0; i < sortedTimestamps.length; i++) {
    if (sortedTimestamps[i] > currentTime) {
      targetTime = sortedTimestamps[i];
      break;
    }
  }

  video.currentTime = targetTime;
  console.log(`Jumped to ${targetTime.toFixed(1)}s`);
  return { success: true, time: targetTime };
}

window.addEventListener('keydown', (event) => {
  if (event.altKey && event.key === 's') {
    saveTimestamp();
  }
  if (event.altKey && event.key === 'j') {
    jumpToSavedPart();
  }
});

function jumpToExactTime(time) {
  const video = document.querySelector('video');
  if (!video) return { success: false, error: 'no-video' };
  video.currentTime = time;
  console.log(`Jumped directly to ${time.toFixed(1)}s`);
  return { success: true, time };
}
window.jumpToSavedPart = jumpToSavedPart;
window.saveTimestamp = saveTimestamp;


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'save') {
    saveTimestamp().then((result) => {
      sendResponse(result);
    });
    return true; 
  }

  if (message.action === 'jump') {
    jumpToSavedPart().then((result) => {
      sendResponse(result);
    });
    return true;
  }

  if (message.action === 'getVideoId') {
    sendResponse({ videoId: currentVideoId });
  }

  if (message.action === 'jumpToTime') {
  const result = jumpToExactTime(message.time);
  sendResponse(result);
}
});
