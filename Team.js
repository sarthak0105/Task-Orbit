document.addEventListener('DOMContentLoaded', () => {
  const progressCanvas = document.getElementById('progressCanvas');

  if (!progressCanvas) {
    console.error('Canvas element not found');
    return;
  }

  const fetchAndDisplayProgress = () => {
    const userProgress = localStorage.getItem('userProgress');
    if (userProgress !== null) {
      const progressValue = parseInt(userProgress, 10);
      drawCircle(progressCanvas, progressValue);
      updateProgressDescription(progressValue);
    } else {
      console.error('User progress not found in local storage');
    }
  };

  fetchAndDisplayProgress();

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      fetchAndDisplayProgress();
    }
  });
});

function updateProgressDescription(progress) {
  const progressDescription = document.getElementById('progress-description');
  if (progress >= 90) {
    progressDescription.textContent = 'Excellent progress! All tasks are on track.';
  } else if (progress >= 75) {
    progressDescription.textContent = 'Great work! Maintain the momentum.';
  } else if (progress >= 60) {
    progressDescription.textContent = 'Keep it up! Focus on completing remaining tasks.';
  } else if (progress >= 40) {
    progressDescription.textContent = 'Moderate progress. Prioritize tasks for better results.';
  } else {
    progressDescription.textContent = 'Work needed to catch up. Focus on completing tasks.';
  }
}

function drawCircle(canvas, percentage) {
  const ctx = canvas.getContext('2d');
  const radius = canvas.width / 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  ctx.arc(radius, radius, radius - 3, 0, 2 * Math.PI);
  ctx.strokeStyle = '#FED36A';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(radius, radius, radius - 3, 0, 2 * Math.PI * (percentage / 100));
  ctx.strokeStyle = '#02021C';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.font = '20px Arial';
  ctx.fillStyle = '#FDBD01';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${percentage}%`, radius, radius);
}
