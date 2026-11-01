// Calendar widget — renders upcoming events from the server proxy (/api/calendar).
// The server already formats day/time labels in Europe/Helsinki, so this just lays
// them out. Renders into #calendarEvents only if that container exists.

async function fetchCalendar() {
  const container = document.getElementById('calendarEvents');
  if (!container) return;
  try {
    const response = await fetch('/api/calendar');
    if (!response.ok) throw new Error('Calendar fetch failed');
    const data = await response.json();

    if (!data.events || data.events.length === 0) {
      container.innerHTML = '<div class="calendar-empty">Ei tulevia tapahtumia</div>';
      return;
    }

    container.innerHTML = '';
    data.events.forEach(ev => {
      const row = document.createElement('div');
      row.className = 'calendar-event';

      const when = document.createElement('span');
      when.className = 'cal-when';
      when.textContent = ev.time ? `${ev.day} ${ev.time}` : ev.day;

      const title = document.createElement('span');
      title.className = 'cal-title';
      title.textContent = ev.summary;

      row.appendChild(when);
      row.appendChild(title);
      container.appendChild(row);
    });
  } catch (error) {
    console.error('Calendar error:', error);
    container.innerHTML = '<div class="calendar-empty">Kalenteri ei saatavilla</div>';
  }
}

fetchCalendar();
setInterval(fetchCalendar, 15 * 60 * 1000);
