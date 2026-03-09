// Weather widget - fetches from local server proxy for fast loading

async function fetchWeather() {
  try {
    const response = await fetch('/api/weather');

    if (!response.ok) {
      throw new Error('Weather fetch failed');
    }

    const data = await response.json();

    const tempElement = document.querySelector('.weather-temp');
    const descElement = document.querySelector('.weather-desc');

    if (tempElement) {
      tempElement.textContent = `${data.temp}°C`;
    }

    if (descElement) {
      descElement.textContent = `${data.description}, ${data.windspeed} km/h`;
    }

  } catch (error) {
    console.error('Failed to fetch weather:', error);

    const tempElement = document.querySelector('.weather-temp');
    const descElement = document.querySelector('.weather-desc');

    if (tempElement) {
      tempElement.textContent = '--°C';
    }

    if (descElement) {
      descElement.textContent = 'Weather unavailable';
    }
  }
}

// Fetch weather on page load
fetchWeather();

// Refresh weather every 30 minutes
setInterval(fetchWeather, 30 * 60 * 1000);
