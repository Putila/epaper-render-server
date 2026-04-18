// Advanced weather widget — renders into .weather-advanced if the container is present.
// Uses inline SVG icons chosen to quantize cleanly on the 6-color e-paper palette
// (pure yellow/blue/red fills, solid black outlines — no gradients or greys).

(function () {
  const root = document.getElementById('weatherAdvanced');
  if (!root) return;

  const DAY_NAMES_FI = ['Su','Ma','Ti','Ke','To','Pe','La'];
  const UV_LABEL = v =>
    v < 3 ? 'matala' : v < 6 ? 'kohtalainen' : v < 8 ? 'korkea' : v < 11 ? 'erittäin korkea' : 'äärimmäinen';

  // Icon markup — each class is wired to a Material Symbols SVG via mask-image
  // in grid.css. Colors (sun yellow, rain/hail/mix blue, thunder red, cloud/snow/fog
  // white) are applied via background-color on the span.
  const icon = cls => `<span class="wx-icon wx-${cls}"></span>`;
  const ICON = {
    sun: icon('sun'),
    partly: icon('partly'),
    cloud: icon('cloud'),
    fog: icon('fog'),
    rain: icon('rain'),
    drizzle: icon('drizzle'),
    snow: icon('snow'),
    thunder: icon('thunder'),
    hail: icon('hail'),
    mix: icon('mix')
  };

  function iconFor(code) {
    if (code === 0) return ICON.sun;
    if (code === 1 || code === 2) return ICON.partly;
    if (code === 3) return ICON.cloud;
    if (code === 45 || code === 48) return ICON.fog;
    if (code >= 51 && code <= 55) return ICON.drizzle;
    if (code === 66 || code === 67) return ICON.mix;           // freezing rain
    if ((code >= 61 && code <= 65) || (code >= 80 && code <= 82)) return ICON.rain;
    if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return ICON.snow;
    if (code === 95) return ICON.thunder;
    if (code === 96 || code === 99) return ICON.hail;          // thunder + hail
    return ICON.cloud;
  }

  function formatHourRange(s, e) {
    const h = n => String(n).padStart(2, '0');
    return `${h(s)}–${h(e)}`;
  }

  async function render() {
    let data;
    try {
      const res = await fetch('/api/weather');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      data = await res.json();
    } catch (err) {
      root.innerHTML = '<div class="wa-error">Sää ei saatavilla</div>';
      return;
    }

    const now = new Date();
    const dateStr = `${DAY_NAMES_FI[now.getDay()]} ${now.getDate()}.${now.getMonth() + 1}.`;

    const hourlyHtml = (data.hourly || []).map(h => `
      <div class="wa-hour">
        <div class="wa-hour-time">${String(h.hour).padStart(2, '0')}</div>
        <div class="wa-hour-icon">${iconFor(h.code)}</div>
        <div class="wa-hour-temp">${h.temp}°</div>
      </div>`).join('');

    const extras = [];
    if (data.rainToday && data.rainToday.events.length) {
      const ranges = data.rainToday.events.map(e => formatHourRange(e.startHour, e.endHour)).join(', ');
      extras.push(`<div class="wa-alert wa-rain">${iconFor(63)}<span><strong>${data.rainToday.totalMm} mm</strong> · ${ranges}</span></div>`);
    }
    if (data.uvMax != null) {
      extras.push(`<div class="wa-alert wa-uv">${ICON.sun}<span>UV <strong>${data.uvMax}</strong> · ${UV_LABEL(data.uvMax)}</span></div>`);
    }

    root.innerHTML = `
      <div class="wa-header">
        <span class="wa-location">Tampere</span>
        <span class="wa-date">${dateStr}</span>
      </div>
      <div class="wa-current">
        <div class="wa-icon-big">${iconFor(data.weatherCode)}</div>
        <div class="wa-current-text">
          <div class="wa-temp">${data.temp}°</div>
          <div class="wa-desc">${data.description}</div>
        </div>
      </div>
      <div class="wa-hourly">${hourlyHtml}</div>
      <div class="wa-extras">${extras.join('')}</div>
    `;
  }

  render();
  setInterval(render, 30 * 60 * 1000);
})();
