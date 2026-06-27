// Bildung lessons — fresh German content, story-shaped, ~80-100 words per card.
// Topic taxonomy follows public beginner-Bitcoin curriculum; prose is original.
const lessons = {
  1: {
    title: "Was ist Geld?",
    cards: [
      {
        h: "Wofür ist Geld da?",
        body: `<p>Stell dir den Bäcker vor. Früher hätte er für ein Brot drei Eier vom Bauern getauscht. Was, wenn der Bauer aber Schuhe will? Der Bäcker muss erst Schuhe finden, dann gegen Eier tauschen, dann Eier gegen Brot.</p><p>Geld löst dieses Problem. Es ist das, womit alle einverstanden sind, etwas zu tauschen — egal, was gerade gebraucht wird.</p><strong>Geld ist nicht das Ziel. Geld ist die Sprache, in der Werte gehandelt werden.</strong>`
      },
      {
        h: "Was macht gutes Geld aus?",
        body: `<p>Gutes Geld muss vier Dinge können:</p><p>· <b>Knapp</b> sein — sonst verliert es Wert.<br>· <b>Haltbar</b> sein — heute, in zehn, in hundert Jahren.<br>· <b>Teilbar</b> sein — für ein Brot UND für ein Haus.<br>· <b>Übertragbar</b> sein — von dir zu mir, ohne Erlaubnis von Dritten.</p><strong>Gold konnte das jahrtausendelang. Der Euro? Drei von vier — Knappheit fehlt.</strong>`
      },
      {
        h: "Was ist Inflation?",
        body: `<p>Wenn die Zentralbank mehr Geld druckt, sinkt der Wert jedes einzelnen Euros. Dein Sparbuch hat heute weniger Kaufkraft als letztes Jahr — selbst wenn die Zahl darauf gleich blieb.</p><p>1990 kostete ein Brot 1 DM. Heute 4 €. Das Brot ist nicht teurer geworden. Dein Geld ist weniger wert.</p><strong>Inflation ist eine stille Steuer. Du zahlst sie, ohne dass dich jemand fragt.</strong>`
      },
      {
        h: "1971 — der Tag, an dem Geld die Bremse verlor",
        body: `<p>Bis 1971 war der Dollar an Gold gekoppelt. Pro 35 Dollar konntest du eine Unze Gold bei der US-Regierung holen. Die Geldmenge konnte nicht beliebig wachsen.</p><p>Am 15. August 1971 hat Nixon die Tür zu Gold geschlossen. Seitdem druckt jede Zentralbank, soviel sie für nötig hält.</p><strong>Der Euro hat seit 2001 etwa 40 % seines Werts verloren.</strong>`
      }
    ]
  },
  2: {
    title: "Warum Bitcoin?",
    cards: [
      {
        h: "Was ist Bitcoin überhaupt?",
        body: `<p>Bitcoin ist Geld, das niemand kontrolliert. Kein Land, keine Bank, keine Firma.</p><p>Es lebt auf tausenden Computern weltweit gleichzeitig. Wenn einer ausfällt, läuft es weiter. Wenn ein Land es verbietet, läuft es woanders weiter.</p><p>Du brauchst nur das Internet — und einen Schlüssel, den nur du hast.</p><strong>Bitcoin ist kein Unternehmen. Bitcoin ist ein Protokoll. Wie E-Mail.</strong>`
      },
      {
        h: "Warum wurde Bitcoin erfunden?",
        body: `<p>2008 — Banken pleite, Regierungen zahlen mit dem Geld der Steuerzahler. Niemand wusste mehr, wem zu vertrauen war.</p><p>Im Oktober 2008 veröffentlichte ein Unbekannter unter dem Namen Satoshi Nakamoto ein neunseitiges Dokument: Bitcoin. Geld ohne Mittelsmann, ohne Banken, ohne Vertrauen in Personen.</p><p>Im ersten Block, am 3. Januar 2009, hinterließ Satoshi eine Zeitungsschlagzeile als Notiz — eine Erinnerung daran, warum Bitcoin existiert.</p>`
      },
      {
        h: "Warum nicht andere Kryptos?",
        body: `<p>Es gibt tausende Kryptowährungen. Die meisten haben einen Chef, einen Marketing-Plan, einen Token-Verkauf. Sie kommen, sie gehen.</p><p>Bitcoin hat keinen Chef. Niemand kann den Code im Alleingang ändern. Niemand kann mehr drucken. Die Regeln stehen fest seit 2009.</p><strong>Knappheit ist kein Feature. Knappheit ist DIE Sache.</strong>`
      }
    ]
  },
  3: {
    title: "Bitcoin kaufen",
    cards: [
      {
        h: "Sparplan oder einmalig kaufen?",
        body: `<p>Stell dir vor, du willst 1.200 € in Bitcoin investieren. Zwei Wege:</p><p>1. Alles auf einmal heute. Geht der Preis hoch, freust du dich. Geht er runter, ärgerst du dich.</p><p>2. 100 € jeden Monat, ein Jahr lang. Du kaufst mal teuer, mal billig — am Ende der Durchschnitt.</p><strong>Der Sparplan ist langweiliger. Aber er nimmt dir die Frage "ist heute der richtige Tag?" ab.</strong>`
      },
      {
        h: "Wie viel?",
        body: `<p>Faustregel: nur, was du nicht brauchst. Nicht die Miete. Nicht das Ersparte für die Steuer.</p><p>Ein Bitcoin kostet zu viel? Du kaufst nicht ganze Bitcoin. Du kaufst Sats — jede Münze hat 100.000.000 davon. 10 € sind heute etwa 10.000 Sats.</p><strong>Klein anfangen. Nur dranbleiben.</strong>`
      },
      {
        h: "Was kostet das wirklich?",
        body: `<p>Wenn du Bitcoin kaufst, gibst du Euro auf. Steigt der Preis, hast du gewonnen. Fällt er, hast du verloren — gemessen in Euro.</p><p>Aber: 1 Bitcoin bleibt 1 Bitcoin. Die Kaufkraft eines Bitcoin gegen Eier, Brote, Häuser hat über 15 Jahre stetig zugenommen.</p><strong>Der Euro-Preis ist Lärm. Die Knappheit ist das Signal.</strong>`
      }
    ]
  },
  4: {
    title: "Sicher haben",
    cards: [
      {
        h: "Was ist eine Wallet?",
        body: `<p>Eine Wallet ist nicht der Ort, wo dein Bitcoin liegt. Bitcoin liegt im Netzwerk. Eine Wallet ist der Schlüssel, mit dem du es bewegen kannst.</p><p>Es gibt zwei Arten:</p><p>· <b>Software-Wallet</b> — App auf deinem Handy. Bequem, aber nur so sicher wie dein Handy.<br>· <b>Hardware-Wallet</b> — ein kleines Gerät, offline. Aufwändiger, aber unangreifbar.</p><strong>Die Wallet ist der Schlüssel. Nicht das Schloss.</strong>`
      },
      {
        h: "Privater Schlüssel — der einzige Schlüssel",
        body: `<p>Wer den privaten Schlüssel hat, hat den Bitcoin. Punkt.</p><p>Verlierst du ihn, ist der Bitcoin weg — niemand kann ihn dir zurückgeben. Auch wir nicht.</p><p>Gibt jemand anderes ihn ein, sind die Bitcoin weg — niemand kann sie zurückholen.</p><strong>Wer den Schlüssel hat, hat das Geld.</strong>`
      },
      {
        h: "Wie bewahrt man es sicher auf?",
        body: `<p>Drei Regeln:</p><p>1. Schreibe deine Wiederherstellungswörter auf Papier. Kein Foto. Kein Cloud-Backup.</p><p>2. Bewahre sie an zwei Orten auf — z. B. zu Hause und im Bankschließfach.</p><p>3. Sage niemandem, dass du Bitcoin hast. Auch nicht Kollegen am Stammtisch.</p><strong>Bitcoin ist Eigenverantwortung. Das ist die Stärke und die Last zugleich.</strong>`
      }
    ]
  }
};

const lessonModal = document.querySelector('.lesson-modal');
const lessonTitleEl = lessonModal.querySelector('.lesson-modal-title');
const lessonCounterEl = lessonModal.querySelector('.lesson-modal-counter');
const lessonTrackEl = lessonModal.querySelector('.lesson-modal-track');
const lessonCloseBtn = lessonModal.querySelector('.lesson-modal-close');
const lessonPrevBtn = lessonModal.querySelector('.lesson-modal-prev');
const lessonNextBtn = lessonModal.querySelector('.lesson-modal-next');

let currentLesson = null;
let currentCardIdx = 0;

const setCard = (idx, animate = true) => {
  if (!currentLesson) return;
  const max = currentLesson.cards.length - 1;
  idx = Math.max(0, Math.min(idx, max));
  currentCardIdx = idx;
  if (!animate) lessonTrackEl.style.transition = 'none';
  lessonTrackEl.style.transform = `translateX(-${idx * 100}%)`;
  if (!animate) requestAnimationFrame(() => { lessonTrackEl.style.transition = ''; });
  lessonCounterEl.textContent = `${idx + 1} / ${currentLesson.cards.length}`;
  lessonPrevBtn.disabled = idx === 0;
  lessonNextBtn.disabled = idx === max;
};

// Lesson progress — which signs the user has walked. Persisted; lights the lantern.
const DONE_KEY = 'bb-bildung-done';
const loadDone = () => { try { return new Set(JSON.parse(localStorage.getItem(DONE_KEY) || '[]')); } catch { return new Set(); } };
const markDone = (id) => {
  const done = loadDone();
  done.add(String(id));
  try { localStorage.setItem(DONE_KEY, JSON.stringify([...done])); } catch {}
};
const paintProgress = () => {
  const done = loadDone();
  document.querySelectorAll('.bildung-sign').forEach((sign) => {
    sign.dataset.done = done.has(sign.dataset.lesson) ? 'true' : 'false';
  });
};

export const openLesson = (lessonId) => {
  const lesson = lessons[lessonId];
  if (!lesson) return;
  markDone(lessonId);
  paintProgress();
  currentLesson = lesson;
  currentCardIdx = 0;
  lessonTitleEl.textContent = `${lessonId}. ${lesson.title}`;
  lessonTrackEl.innerHTML = lesson.cards.map((c) =>
    `<article class="lesson-card"><h3>${c.h}</h3>${c.body}</article>`
  ).join('');
  setCard(0, false);
  lessonModal.dataset.open = 'true';
  requestAnimationFrame(() => lessonCloseBtn.focus());
};

export const closeLesson = () => {
  lessonModal.dataset.open = 'false';
  currentLesson = null;
};

lessonCloseBtn.addEventListener('click', closeLesson);
lessonPrevBtn.addEventListener('click', () => setCard(currentCardIdx - 1));
lessonNextBtn.addEventListener('click', () => setCard(currentCardIdx + 1));
lessonModal.addEventListener('click', (e) => { if (e.target === lessonModal) closeLesson(); });

document.addEventListener('keydown', (e) => {
  if (lessonModal.dataset.open !== 'true') return;
  if (e.key === 'Escape') closeLesson();
  else if (e.key === 'ArrowLeft') setCard(currentCardIdx - 1);
  else if (e.key === 'ArrowRight') setCard(currentCardIdx + 1);
});

// Swipe gesture on the card track
let dragStartX = null;
let dragStartY = null;
lessonTrackEl.addEventListener('pointerdown', (e) => {
  dragStartX = e.clientX;
  dragStartY = e.clientY;
});
lessonTrackEl.addEventListener('pointerup', (e) => {
  if (dragStartX === null) return;
  const dx = e.clientX - dragStartX;
  const dy = e.clientY - dragStartY;
  dragStartX = dragStartY = null;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
    setCard(currentCardIdx + (dx < 0 ? 1 : -1));
  }
});
lessonTrackEl.addEventListener('pointercancel', () => { dragStartX = dragStartY = null; });

paintProgress();

// Bildung sign taps open the lesson modal
document.querySelectorAll('.bildung-sign').forEach((sign) => {
  const open = () => openLesson(sign.dataset.lesson);
  sign.addEventListener('click', open);
  sign.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
  });
});

// Newspaper modal — vintage paper, side-click pager, escape/arrow keys
const newspaperModal     = document.querySelector('.newspaper-modal');
const newspaperTrack     = newspaperModal.querySelector('.newspaper-track');
const newspaperPageNumEl = newspaperModal.querySelector('.newspaper-page-number');
const newspaperCloseBtn  = newspaperModal.querySelector('.newspaper-close');
const newspaperPrevEdge  = newspaperModal.querySelector('.newspaper-edge--prev');
const newspaperNextEdge  = newspaperModal.querySelector('.newspaper-edge--next');
const newspaperDateEl    = newspaperModal.querySelector('.newspaper-date');
const newspaperPageCount = newspaperTrack.children.length;
let newspaperPageIdx = 0;

const setNewspaperPage = (idx, animate = true) => {
  idx = Math.max(0, Math.min(idx, newspaperPageCount - 1));
  newspaperPageIdx = idx;
  if (!animate) newspaperTrack.style.transition = 'none';
  newspaperTrack.style.transform = `translateX(-${idx * 100}%)`;
  if (!animate) requestAnimationFrame(() => { newspaperTrack.style.transition = ''; });
  newspaperPageNumEl.textContent = `${idx + 1} / ${newspaperPageCount}`;
  newspaperPrevEdge.setAttribute('aria-disabled', idx === 0 ? 'true' : 'false');
  newspaperNextEdge.setAttribute('aria-disabled', idx === newspaperPageCount - 1 ? 'true' : 'false');
};

export const openNewspaper = () => {
  const dateOpts = { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' };
  newspaperDateEl.textContent = new Date().toLocaleDateString('de-DE', dateOpts);
  setNewspaperPage(0, false);
  newspaperModal.dataset.open = 'true';
  newspaperModal.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(() => newspaperCloseBtn.focus());
};

export const closeNewspaper = () => {
  newspaperModal.dataset.open = 'false';
  newspaperModal.setAttribute('aria-hidden', 'true');
};

newspaperCloseBtn.addEventListener('click', closeNewspaper);
newspaperPrevEdge.addEventListener('click', () => {
  if (newspaperPrevEdge.getAttribute('aria-disabled') === 'true') return;
  setNewspaperPage(newspaperPageIdx - 1);
});
newspaperNextEdge.addEventListener('click', () => {
  if (newspaperNextEdge.getAttribute('aria-disabled') === 'true') return;
  setNewspaperPage(newspaperPageIdx + 1);
});
newspaperModal.addEventListener('click', (e) => {
  if (e.target === newspaperModal) closeNewspaper();
});
document.addEventListener('keydown', (e) => {
  if (newspaperModal.dataset.open !== 'true') return;
  if (e.key === 'Escape') closeNewspaper();
  else if (e.key === 'ArrowLeft')  setNewspaperPage(newspaperPageIdx - 1);
  else if (e.key === 'ArrowRight') setNewspaperPage(newspaperPageIdx + 1);
});

const newspaperSign = document.querySelector('.bildung-newspaper');
if (newspaperSign) {
  newspaperSign.addEventListener('click', openNewspaper);
  newspaperSign.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openNewspaper(); }
  });
}
