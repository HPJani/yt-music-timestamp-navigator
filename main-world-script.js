function getId() {
  const player = document.querySelector('#movie_player');
  if (!player || typeof player.getVideoData !== 'function') return null;
  return player.getVideoData().video_id;
}

let lastSentId = null;

function checkAndSendId() {
  const id = getId();
  if (id && id !== lastSentId) {
    lastSentId = id;
    console.log('main-world: sending id', id);
    window.postMessage({ type: 'YT_MUSIC_VIDEO_ID', videoId: id }, '*');
  }
}
setInterval(checkAndSendId, 1000);
checkAndSendId();