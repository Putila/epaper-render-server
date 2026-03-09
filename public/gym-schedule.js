const DAYS = ['sun','mon','tue','wed','thu','fri','sat'];
const DAY_NAMES = ['Sunnuntai','Maanantai','Tiistai','Keskiviikko','Torstai','Perjantai','Lauantai'];

const schedules = document.querySelectorAll('.gym-schedule');

function setDay(dayIndex) {
  const dayClass = 'day-' + DAYS[dayIndex];

  schedules.forEach(el => {
    el.className = el.className.replace(/day-\w+/, '');
    el.classList.add(dayClass);
  });
}

// Auto-select today
setDay(new Date().getDay());
