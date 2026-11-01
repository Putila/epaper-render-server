// Gym group-class schedule — renders /api/gym (GOGO City / Park / Hervanta) into
// the .gym-card columns. The server picks today's remaining classes, or
// tomorrow's once today is over, and formats times in Europe/Helsinki.

(function () {
  const cards = document.querySelectorAll('.gym-card[data-gym]');
  if (!cards.length) return;

  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  function setAll(msg) {
    cards.forEach(card => { card.querySelector('.gym-list').innerHTML = `<div class="gym-empty">${msg}</div>`; });
  }

  async function render() {
    let d;
    try {
      const res = await fetch('/api/gym');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      d = await res.json();
    } catch (e) {
      setAll('Ei saatavilla');
      return;
    }

    const byId = {};
    (d.gyms || []).forEach(g => { byId[g.id] = g; });

    cards.forEach(card => {
      const g = byId[card.dataset.gym];
      const list = card.querySelector('.gym-list');
      const title = card.querySelector('h2');
      title.textContent = (g ? g.name : card.dataset.gym) + (d.day === 'tomorrow' ? ' · huom.' : '');

      if (!g || g.error) { list.innerHTML = '<div class="gym-empty">Ei saatavilla</div>'; return; }
      if (!g.classes.length) { list.innerHTML = '<div class="gym-empty">Ei tunteja</div>'; return; }

      list.innerHTML = g.classes.map(c => {
        const cls = ['gym-class'];
        if (c.cancelled) cls.push('cancelled');
        else if (c.full) cls.push('full');
        return `<div class="${cls.join(' ')}"><span class="gc-time">${esc(c.time)}</span> <span class="gc-name">${esc(c.name)}</span></div>`;
      }).join('');
    });
  }

  render();
  setInterval(render, 15 * 60 * 1000);
})();
