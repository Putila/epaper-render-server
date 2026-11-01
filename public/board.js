// Telegram "home board" widget — memos / dinner / shopping from /api/board.
// Placement (off | strip | replace | alternate) is set in /admin and applied
// here. When there's no content, the board yields to the photo so the display
// never shows an empty box.

(function () {
  const root = document.getElementById('board-widget');
  const boardEl = document.getElementById('right-board');
  const stackEl = document.getElementById('right-stack');
  if (!root || !boardEl || !stackEl) return;

  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  function arrange(placement, hasContent) {
    boardEl.classList.remove('board-strip', 'board-full');
    if (placement === 'off' || !hasContent) {
      boardEl.hidden = true;
      stackEl.hidden = false;
      return;
    }
    if (placement === 'strip') {
      boardEl.hidden = false;
      boardEl.classList.add('board-strip');
      stackEl.hidden = false;
      return;
    }
    // replace / alternate → board takes the whole right column
    let showFull = true;
    if (placement === 'alternate') {
      // Flip every 2 min so successive Pi fetches alternate photo <-> board.
      showFull = Math.floor(Date.now() / (2 * 60 * 1000)) % 2 === 0;
    }
    boardEl.hidden = !showFull;
    stackEl.hidden = showFull;
    if (showFull) boardEl.classList.add('board-full');
  }

  function render(d) {
    const sec = d.sections || {};
    const hasContent = !!((sec.dinner && d.dinner) ||
      (sec.shopping && d.shopping && d.shopping.length) ||
      (sec.memos && d.memos && d.memos.length));

    arrange(d.placement || 'off', hasContent);
    if (!hasContent) { root.innerHTML = ''; return; }

    let html = '';
    if (sec.dinner && d.dinner) {
      html += `<div class="board-dinner"><span class="board-label">Ruoka</span><span class="dinner-text">${esc(d.dinner.text)}</span></div>`;
    }
    if (sec.shopping && d.shopping && d.shopping.length) {
      const items = d.shopping
        .map(i => `<span class="shop-item${i.done ? ' done' : ''}">${esc(i.text)}</span>`).join('');
      html += `<div class="board-shopping"><div class="board-label">Kauppalista</div><div class="shop-items">${items}</div></div>`;
    }
    if (sec.memos && d.memos && d.memos.length) {
      const memos = d.memos.map(m =>
        `<div class="memo-item"><span class="memo-text">${esc(m.text)}</span>` +
        `${m.from ? `<span class="memo-from">${esc(m.from)}</span>` : ''}</div>`).join('');
      html += `<div class="board-memos"><div class="board-label">Muistilaput</div>${memos}</div>`;
    }
    root.innerHTML = html;
  }

  async function fetchBoard() {
    try {
      const res = await fetch('/api/board');
      if (!res.ok) throw new Error('board fetch failed');
      render(await res.json());
    } catch (e) {
      console.error('Board error:', e);
      arrange('off', false);
    }
  }

  fetchBoard();
  setInterval(fetchBoard, 5 * 60 * 1000);
})();
