// Google Calendar widget - fetches events from server proxy

async function fetchCalendar() {
  try {
    const response = await fetch('/api/calendar');
    if (!response.ok) throw new Error('Calendar fetch failed');
    const data = await response.json();

    const container = document.getElementById('calendarEvents');
    if (!container) return;

    if (!data.events || data.events.length === 0) {
      container.textContent = 'Ei tapahtumia';
      return;
    }

    container.innerHTML = '';
    data.events.forEach(ev => {
      const div = document.createElement('div');
      div.className = 'calendar-event';

      let timeStr = '';
      if (!ev.allDay) {
        const start = new Date(ev.start);
        timeStr = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')} `;
      }

      div.textContent = timeStr + ev.summary;
      container.appendChild(div);
    });
  } catch (error) {
    console.error('Calendar error:', error);
    const container = document.getElementById('calendarEvents');
    if (container) container.textContent = 'Kalenteri ei saatavilla';
  }
}

fetchCalendar();
setInterval(fetchCalendar, 15 * 60 * 1000);
