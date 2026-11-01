// Electricity spot price strip — renders /api/spot (Nord Pool FI, c/kWh incl. VAT).
// The server does all the time math in Europe/Helsinki; this only lays it out.
// Price colours use pure palette colours so they survive the 6-colour quantization.

(function () {
  const root = document.getElementById('spot-widget');
  if (!root) return;

  const fmt = (v, digits = 1) => (v == null ? '–' : v.toFixed(digits).replace('.', ','));
  const level = v => (v == null ? '' : v < 5 ? 'spot-low' : v < 15 ? 'spot-mid' : 'spot-high');

  async function render() {
    let d;
    try {
      const res = await fetch('/api/spot');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      d = await res.json();
    } catch (e) {
      root.innerHTML = '<div class="spot-error">Sähkön hinta ei saatavilla</div>';
      return;
    }

    const next = (d.next || []).map(h => `
      <div class="spot-hour">
        <div class="spot-hour-time">${String(h.hour).padStart(2, '0')}</div>
        <div class="spot-hour-price ${level(h.price)}">${fmt(h.price)}</div>
      </div>`).join('');

    root.innerHTML = `
      <div class="spot-now">
        <div class="spot-label">Sähkö nyt</div>
        <div class="spot-price ${level(d.current && d.current.price)}">${fmt(d.current && d.current.price, 2)}<span class="spot-unit"> c/kWh</span></div>
      </div>
      <div class="spot-next">${next}</div>
      <div class="spot-avgs">
        <div><span class="spot-avg-label">Tänään ka</span> <strong class="${level(d.todayAvg)}">${fmt(d.todayAvg)}</strong></div>
        <div><span class="spot-avg-label">Huomenna ka</span> ${d.tomorrowAvg == null
          ? '<span class="spot-avg-label">klo 14 jälk.</span>'
          : `<strong class="${level(d.tomorrowAvg)}">${fmt(d.tomorrowAvg)}</strong>`}</div>
      </div>`;
  }

  render();
  setInterval(render, 5 * 60 * 1000);
})();
