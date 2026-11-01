// Lunch menu widget - fetches Juvenes Saarni + Frenckell menus from server proxy.

async function fetchLunch() {
  const root = document.getElementById('lunch-widget');
  if (!root) return;
  try {
    const res = await fetch('/api/lunch');
    if (!res.ok) throw new Error('lunch fetch failed');
    const data = await res.json();
    renderLunch(root, data.restaurants || []);
  } catch (e) {
    console.error('Lunch error:', e);
    root.innerHTML = '<div class="lunch-error">Lounastiedot eivät saatavilla</div>';
  }
}

function renderLunch(root, restaurants) {
  root.innerHTML = '';
  for (const r of restaurants) {
    const col = document.createElement('div');
    col.className = 'lunch-col';

    const h = document.createElement('div');
    h.className = 'lunch-name';
    h.textContent = r.name;
    col.appendChild(h);

    if (!r.options || r.options.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'lunch-empty';
      empty.textContent = r.error ? '—' : 'Ei lounasta';
      col.appendChild(empty);
    } else {
      for (const opt of r.options) {
        for (const item of opt.items) {
          const line = document.createElement('div');
          line.className = 'lunch-item';
          line.textContent = item;
          col.appendChild(line);
        }
      }
    }
    root.appendChild(col);
  }
}

fetchLunch();
setInterval(fetchLunch, 30 * 60 * 1000);
