/**
 * Kleine Helfer für die Startseite. Die Seite funktioniert auch ohne dieses Skript.
 */

// Alte Links wie …/#/sammlung (aus der Zeit, als die App die Startseite war) in die App umleiten.
if (location.hash.startsWith('#/')) {
  location.replace(`app/${location.hash}`);
}

// Wer schon Kassetten erfasst hat, kommt direkt zu seiner Sammlung.
try {
  const raw = localStorage.getItem('kassetten-retten:sammlung:v1');
  const count = raw ? (JSON.parse(raw)?.cassettes?.length ?? 0) : 0;
  if (count > 0) {
    document.querySelectorAll<HTMLAnchorElement>('[data-sammlung-link]').forEach((a) => {
      a.textContent = `Zu deiner Sammlung (${count})`;
      a.href = 'app/#/sammlung';
    });
  }
} catch {
  /* kein Zugriff auf den Speicher – Standardtext bleibt */
}

// Anfrage-Leiste am Handy erst zeigen, wenn der obere Bereich verlassen ist.
const sticky = document.querySelector('.sticky-cta');
const hero = document.querySelector('.hero');
const closing = document.querySelector('.closing');
if (sticky && hero && 'IntersectionObserver' in window) {
  let heroVisible = true;
  let closingVisible = false;
  const update = () => sticky.classList.toggle('is-visible', !heroVisible && !closingVisible);
  new IntersectionObserver(([e]) => {
    heroVisible = e.isIntersecting;
    update();
  }).observe(hero);
  if (closing) {
    new IntersectionObserver(([e]) => {
      closingVisible = e.isIntersecting;
      update();
    }).observe(closing);
  }
} else {
  sticky?.classList.add('is-visible');
}
