// Drive photo widget - loads random photo from server proxy

function refreshPhoto() {
  const img = document.getElementById('drivePhoto');
  if (img) {
    img.src = '/api/photo?t=' + Date.now();
  }
}

// Refresh photo every 30 minutes
setInterval(refreshPhoto, 30 * 60 * 1000);
