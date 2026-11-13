const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

function showEntrance() {
  if (location.hash || reducedMotion.matches || !Element.prototype.animate ||
      !CSS.supports("clip-path", 'path("M0 0L1 1Z")')) return;

  const page = document.querySelector("main");
  const overlay = document.createElement("div");
  overlay.className = "intro";
  overlay.inert = true;
  overlay.setAttribute("aria-hidden", "true");

  const width = document.documentElement.clientWidth;
  const height = innerHeight;
  const across = Math.round(width * 0.49);
  const down = Math.round(height * 0.49);
  const radius = Math.min(21, width / 30);
  function seam(x1, y1, x2, y2, side) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy);
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const ax = dx / length * radius;
    const ay = dy / length * radius;
    const pt = (along, out) => (mx + along * ax + side * out * ay) + " " +
      (my + along * ay - side * out * ax);
    return "L" + pt(-0.55, 0) + " C" + pt(-0.23, 0.2) + " " + pt(-1, 0.55) + " " + pt(-0.88, 1.14) +
      " C" + pt(-0.75, 2.06) + " " + pt(0.75, 2.06) + " " + pt(0.88, 1.14) +
      " C" + pt(1, 0.55) + " " + pt(0.23, 0.2) + " " + pt(0.55, 0) + " L" + x2 + " " + y2;
  }

  const animations = [];
  const finish = () => {
    overlay.remove();
    listeners.abort();
  };
  const listeners = new AbortController();
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      const x = col ? across : 0, right = col ? width : across;
      const y = row ? down : 0, bottom = row ? height : down;
      const path = "M" + x + " " + y +
        (row ? seam(x, y, right, y, -1) : "L" + right + " " + y) +
        (col ? "L" + right + " " + bottom : seam(right, y, right, bottom, 1)) +
        (row ? "L" + x + " " + bottom : seam(right, bottom, x, bottom, 1)) +
        (col ? seam(x, bottom, x, y, -1) : "L" + x + " " + y) + "Z";
      const tile = document.createElement("div");
      tile.className = "intro-piece";
      tile.style.clipPath = 'path("' + path + '")';
      const copy = page.cloneNode(true);
      copy.querySelectorAll("[id]").forEach(el => el.removeAttribute("id"));
      copy.querySelectorAll(".preview").forEach(img => img.remove());
      copy.style.transform = "translateY(" + -window.scrollY + "px)";
      tile.append(copy);
      overlay.append(tile);
      const index = row * 2 + col;
      animations.push(tile.animate([
        { transform: "translate(" + (col ? 8 : -8) + "px, -" + (row ? 115 : 160) + "px) rotate(" + (col ? 1.2 : -1.2) + "deg)" },
        { transform: "translate(0, 2px)", offset: 0.84 },
        { transform: "none" }
      ], { duration: 720, delay: [145, 60, 0, 115][index], easing: "cubic-bezier(.35,0,.25,1)", fill: "both" }));
    }
  }
  document.body.append(overlay);
  for (const type of ["resize", "scroll", "pointerdown", "keydown", "pagehide"]) {
    window.addEventListener(type, finish, { once: true, passive: true, signal: listeners.signal });
  }
  reducedMotion.addEventListener("change", finish, { signal: listeners.signal });
  Promise.allSettled(animations.map(animation => animation.finished)).then(finish);
}
if (document.visibilityState === "visible") showEntrance();
else document.addEventListener("visibilitychange", showEntrance, { once: true });

const projectList = document.querySelector(".projects");
let activeRow;
function hidePreview() {
  activeRow?.classList.remove("show-preview");
  activeRow = null;
}
function preview(row) {
  hidePreview();
  const bounds = row.getBoundingClientRect();
  const room = document.documentElement.clientWidth - bounds.right - 36;
  if (room < 105) return;
  row.style.setProperty("--preview-width", Math.min(240, room) + "px");
  row.classList.add("show-preview");
  activeRow = row;
}
for (const row of projectList.children) {
  row.addEventListener("pointerenter", event => {
    if (event.pointerType !== "touch") preview(row);
  });
  row.addEventListener("pointerleave", () => {
    if (activeRow === row && !row.querySelector(":focus-visible")) hidePreview();
  });
  row.addEventListener("focusin", event => {
    if (event.target.matches(":focus-visible")) preview(row);
  });
  row.addEventListener("focusout", hidePreview);
}
window.addEventListener("resize", hidePreview);
document.addEventListener("keydown", event => {
  if (event.key === "Escape") hidePreview();
});
