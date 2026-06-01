/*
 * lightbox.js — heirloom click-to-zoom for plates and figured images.
 * Binds to any <a data-lightbox href="…"> link (emitted by the plate
 * shortcode and the render-image hook). With JS disabled the link simply
 * navigates to the full-res image — graceful fallback per CLAUDE.md §6.
 */
(function () {
  "use strict";

  var overlay = null, imgEl = null, capEl = null, closeBtn = null;
  var triggers = [];
  var index = -1;
  var lastFocus = null;

  function build() {
    if (overlay) return;
    overlay = document.createElement("div");
    overlay.className = "lightbox";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Image viewer");
    overlay.tabIndex = -1;
    overlay.innerHTML =
      '<button class="lightbox__close" type="button" aria-label="Close">&times;</button>' +
      '<button class="lightbox__nav lightbox__prev" type="button" aria-label="Previous">&#x2039;</button>' +
      '<button class="lightbox__nav lightbox__next" type="button" aria-label="Next">&#x203A;</button>' +
      '<figure class="lightbox__figure">' +
        '<img class="lightbox__img" alt="">' +
        '<figcaption class="lightbox__caption"></figcaption>' +
      '</figure>';
    document.body.appendChild(overlay);
    imgEl = overlay.querySelector(".lightbox__img");
    capEl = overlay.querySelector(".lightbox__caption");
    closeBtn = overlay.querySelector(".lightbox__close");

    closeBtn.addEventListener("click", close);
    overlay.querySelector(".lightbox__prev").addEventListener("click", function (e) { e.stopPropagation(); go(-1); });
    overlay.querySelector(".lightbox__next").addEventListener("click", function (e) { e.stopPropagation(); go(1); });
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
  }

  function show(i) {
    var a = triggers[i];
    if (!a) return;
    index = i;
    imgEl.src = a.href;
    imgEl.alt = a.dataset.alt || "";
    capEl.textContent = a.dataset.caption || "";
    overlay.querySelector(".lightbox__prev").hidden = i <= 0;
    overlay.querySelector(".lightbox__next").hidden = i >= triggers.length - 1;
    overlay.classList.add("lightbox--open");
    document.documentElement.style.overflow = "hidden";
    if (!lastFocus) lastFocus = document.activeElement;
    closeBtn.focus();
  }

  function close() {
    if (!overlay) return;
    overlay.classList.remove("lightbox--open");
    document.documentElement.style.overflow = "";
    imgEl.src = "";
    index = -1;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    lastFocus = null;
  }

  function go(delta) {
    var next = index + delta;
    if (next >= 0 && next < triggers.length) show(next);
  }

  function init() {
    triggers = Array.from(document.querySelectorAll("a[data-lightbox]"));
    if (!triggers.length) return;
    build();
    triggers.forEach(function (a, i) {
      a.addEventListener("click", function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // let modified clicks through
        e.preventDefault();
        show(i);
      });
    });
  }

  document.addEventListener("keydown", function (e) {
    if (!overlay || !overlay.classList.contains("lightbox--open")) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft") go(-1);
    else if (e.key === "ArrowRight") go(1);
    else if (e.key === "Tab") {
      // Trap focus inside the overlay.
      e.preventDefault();
      closeBtn.focus();
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
