// Reversing the direction and sign produces the matching socket on the next tile.
function edge(dx, dy, side) {
  if (!side) return `l ${dx} ${dy}`;
  const point = (along, out) =>
    `${dx * along - dy * side * out} ${dy * along + dx * side * out}`;
  return [
    `l ${point(.4, 0)}`,
    `c ${point(.08, 0)} ${point(-.04, .18)} ${point(.1, .18)}`,
    `c ${point(.14, 0)} ${point(.02, -.18)} ${point(.1, -.18)}`,
    `l ${point(.4, 0)}`
  ].join(" ");
}

let assemblyStarted = false;

function assemblePage() {
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  if (assemblyStarted || location.hash || scrollY || motion.matches || document.visibilityState !== "visible" ||
      !Element.prototype.animate || !CSS.supports("clip-path", 'path("M0 0L1 1Z")')) return;

  const storageKey = "resumePuzzlePlayed";
  try {
    if (sessionStorage.getItem(storageKey)) return;
    sessionStorage.setItem(storageKey, "1");
  } catch {
    // When storage is blocked, the in-memory flag covers this document.
  }
  assemblyStarted = true;

  const width = document.documentElement.clientWidth;
  const height = document.documentElement.clientHeight;
  const size = Math.max(74, Math.sqrt(width * height / 130));
  const cols = Math.max(1, Math.round(width / size));
  const rows = Math.max(1, Math.round(height / size));
  const overlay = document.createElement("div");
  overlay.className = "assembly";
  overlay.inert = true;
  overlay.setAttribute("aria-hidden", "true");

  const sections = [...document.querySelector(".page").children].map(section => {
    const template = section.cloneNode(true);
    template.removeAttribute("id");
    template.querySelectorAll("[id]").forEach(element => element.removeAttribute("id"));
    template.querySelectorAll(".preview").forEach(image => image.remove());
    return { template, bounds: section.getBoundingClientRect() };
  });
  const animations = [];
  const travelMs = 1000;
  const staggerMs = 1500;
  const fadeInMs = 180;
  const handoffMs = 60;
  // Shuffle the start slots so arrivals stay evenly spaced across the viewport.
  const slots = Array.from({ length: rows * cols }, (_, index) => index);
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }
  const slotMs = staggerMs / Math.max(1, slots.length - 1);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = Math.round(col * width / cols);
      const y = Math.round(row * height / rows);
      const w = Math.round((col + 1) * width / cols) - x;
      const h = Math.round((row + 1) * height / rows) - y;
      const pad = Math.ceil(Math.max(w, h) * .2);
      const left = x - pad;
      const top = y - pad;
      const side = (row + col) % 2 ? 1 : -1;
      const path = [
        `M ${pad} ${pad}`,
        edge(w, 0, row > 0 ? side : 0),
        edge(0, h, col < cols - 1 ? -side : 0),
        edge(-w, 0, row < rows - 1 ? side : 0),
        edge(0, -h, col > 0 ? -side : 0), "Z"
      ].join(" ");
      const slot = document.createElement("div");
      slot.className = "piece-slot";
      Object.assign(slot.style, {
        left: left + "px", top: top + "px", width: w + 2 * pad + "px",
        height: h + 2 * pad + "px", clipPath: `path("${path}")`
      });
      const tile = document.createElement("div");
      tile.className = "piece";
      slot.append(tile);

      // Clip just the sections touching this tile, using their live line breaks.
      for (const { template, bounds } of sections) {
        if (bounds.right < left || bounds.left > x + w + pad ||
            bounds.bottom < top || bounds.top > y + h + pad) continue;
        const fragment = template.cloneNode(true);
        Object.assign(fragment.style, {
          left: bounds.left - left + "px", top: bounds.top - top + "px", width: bounds.width + "px"
        });
        tile.append(fragment);
      }
      overlay.append(slot);
      const angle = Math.random() * 2 * Math.PI;
      const distance = Math.max(6, Math.min(12, w * .1));
      const dx = distance * Math.cos(angle);
      const dy = distance * Math.sin(angle);
      animations.push(tile.animate([
        { transform: `translate(${dx}px, ${dy}px) scale(.92)`, opacity: 0, easing: "ease-in-out" },
        { opacity: 1, offset: fadeInMs / travelMs },
        { transform: "none", opacity: 1 }
      ], {
        duration: travelMs, delay: slots[row * cols + col] * slotMs, fill: "both"
      }));
    }
  }

  document.body.append(overlay);
  // Hand off to the live text as the pieces settle, including pixels along clipped seams.
  animations.push(overlay.animate([{ opacity: 1 }, { opacity: 0 }], {
    delay: travelMs + staggerMs - handoffMs, duration: handoffMs, fill: "forwards"
  }));
  const listeners = new AbortController();
  const finish = () => {
    listeners.abort();
    overlay.remove();
    animations.forEach(animation => animation.cancel());
  };
  for (const event of ["resize", "scroll", "pointerdown", "keydown", "pagehide"]) {
    window.addEventListener(event, finish, { passive: true, signal: listeners.signal });
  }
  motion.addEventListener("change", finish, { signal: listeners.signal });
  Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
    if (overlay.isConnected) finish();
  });
}

// Keep previews out of the flow so hovering never shifts a name or description.
let visiblePreview;
function hidePreview() {
  visiblePreview?.classList.remove("visible");
  visiblePreview = null;
}
function showPreview(link) {
  hidePreview();
  const preview = link.parentElement.querySelector(".preview");
  const left = link.closest(".entries").getBoundingClientRect().right + 16;
  const width = parseFloat(getComputedStyle(preview).width);
  if (left + width + 12 > document.documentElement.clientWidth) return;

  preview.style.left = left + "px";
  preview.classList.add("visible");
  visiblePreview = preview;
  positionPreview(link, preview);
}
function positionPreview(link, preview) {
  const anchor = link.getBoundingClientRect();
  const { height } = preview.getBoundingClientRect();
  const top = anchor.top + (anchor.height - height) / 2;
  preview.style.top = Math.max(8, Math.min(top, innerHeight - height - 8)) + "px";
}

for (const link of document.querySelectorAll(".project")) {
  const dismissOwnPreview = () => {
    if (visiblePreview?.parentElement === link.parentElement) hidePreview();
  };
  link.addEventListener("pointerenter", event => {
    if (event.pointerType !== "touch") showPreview(link);
  });
  link.addEventListener("pointerleave", () => {
    if (!link.matches(":focus-visible")) dismissOwnPreview();
  });
  link.addEventListener("focus", () => {
    if (link.matches(":focus-visible")) showPreview(link);
  });
  link.addEventListener("blur", dismissOwnPreview);
}
window.addEventListener("scroll", () => {
  if (!visiblePreview) return;
  const link = visiblePreview.parentElement.querySelector(".project");
  if (link.matches(":hover, :focus-visible")) {
    const bounds = link.getBoundingClientRect();
    if (bounds.bottom > 0 && bounds.top < innerHeight) {
      positionPreview(link, visiblePreview);
      return;
    }
  }
  hidePreview();
}, { passive: true });
window.addEventListener("resize", hidePreview);
document.addEventListener("keydown", event => {
  if (event.key === "Escape") hidePreview();
});

assemblePage();
