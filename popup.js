const addBtn = document.getElementById('add-btn');
const jumpBtn = document.getElementById('jump-btn');
const editBtn = document.getElementById('edit-btn');
const statusMsg = document.getElementById('status-msg');
const timestampList = document.getElementById('timestamp-list');

let listOpen = false;


function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function showStatus(text) {
  statusMsg.textContent = text;
  setTimeout(() => {
    statusMsg.textContent = '';
  }, 2500);
}

function getActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs[0]);
    });
  });
}

function sendMessageToTab(tabId, message) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ success: false, error: 'no-response' });
        return;
      }
      resolve(response);
    });
  });
}

addBtn.addEventListener('click', async () => {
  const tab = await getActiveTab();
  const result = await sendMessageToTab(tab.id, { action: 'save' });

  if (result?.success) {
    showStatus(`Saved at ${formatTime(result.time)}`);
    if (listOpen) await renderTimestampList();
  } else if (result?.error === 'duplicate') {
    showStatus('Timestamp already saved near this point');
  } else {
    showStatus('Could not save — make sure a song is playing');
  }
});

jumpBtn.addEventListener('click', async () => {
  const tab = await getActiveTab();
  const result = await sendMessageToTab(tab.id, { action: 'jump' });

  if (result?.success) {
    showStatus(`Jumped to ${formatTime(result.time)}`);
  } else if (result?.error === 'no-timestamps') {
    showStatus('No saved parts for this song yet');
  } else {
    showStatus('Could not jump:( make sure a song is playing');
  }
});

async function deleteTimestamp(timeToDelete, videoId) {
  const result = await chrome.storage.local.get([videoId]);
  const timestamps = result[videoId] || [];
  const updated = timestamps.filter((t) => t !== timeToDelete);

  await chrome.storage.local.set({ [videoId]: updated });
  renderTimestampList();
}

async function jumpToTimestamp(time) {
  const tab = await getActiveTab();
  const result = await sendMessageToTab(tab.id, { action: 'jumpToTime', time });

  if (result?.success) {
    showStatus(`Jumped to ${formatTime(time)}`);
  } else {
    showStatus('Could not jump — make sure a song is playing');
  }
}

async function renderTimestampList() {
  const tab = await getActiveTab();
  const idResponse = await sendMessageToTab(tab.id, { action: 'getVideoId' });
  const videoId = idResponse?.videoId;

  if (!videoId) {
    timestampList.innerHTML = '<div class="empty-msg">No song detected yet:(</div>';
    return;
  }

  const result = await chrome.storage.local.get([videoId]);
  const timestamps = result[videoId] || [];

  if (timestamps.length === 0) {
    timestampList.innerHTML = '<div class="empty-msg">No saved parts for this song yet:(</div>';
    return;
  }

  const sorted = [...timestamps].sort((a, b) => a - b);
  timestampList.innerHTML = '';

  sorted.forEach((time) => {
    const row = document.createElement('div');
    row.className = 'timestamp-row';

    const playBtn = document.createElement('button');
    playBtn.className = 'play-btn';
    playBtn.textContent = '▶';
    playBtn.addEventListener('click', () => jumpToTimestamp(time));

    const timeLabel = document.createElement('span');
    timeLabel.className = 'timestamp-time';
    timeLabel.textContent = formatTime(time);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '🗑';
    deleteBtn.addEventListener('click', () => deleteTimestamp(time, videoId));

    row.appendChild(playBtn);
    row.appendChild(timeLabel);
    row.appendChild(deleteBtn);
    timestampList.appendChild(row);
  });
}

editBtn.addEventListener('click', async () => {
  listOpen = !listOpen;

  if (listOpen) {
    timestampList.classList.remove('hidden');
    await renderTimestampList();
  } else {
    timestampList.classList.add('hidden');
  }
});

