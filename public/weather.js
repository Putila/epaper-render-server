// Weather widget using wttr.in
// Fetches weather data for Tampere, Finland

async function fetchWeather() {
  try {
    const response = await fetch('https://wttr.in/Tampere?format=j1');

    if (!response.ok) {
      throw new Error('Weather fetch failed');
    }

    const data = await response.json();

    // Extract current conditions
    const current = data.current_condition[0];
    const temp = current.temp_C;
    const desc = current.weatherDesc[0].value;

    // Update DOM elements
    const tempElement = document.querySelector('.weather-temp');
    const descElement = document.querySelector('.weather-desc');

    if (tempElement) {
      tempElement.textContent = `${temp}°C`;
    }

    if (descElement) {
      descElement.textContent = desc;
    }

  } catch (error) {
    console.error('Failed to fetch weather:', error);

    // Fallback display
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

// Optional: Refresh weather every 30 minutes
setInterval(fetchWeather, 30 * 60 * 1000);
