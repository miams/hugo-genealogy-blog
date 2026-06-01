/*
 * storytimeline.js — heirloom interactive life axis (CLAUDE.md §5.5b).
 *
 * Phase 1: zoom + pan foundation.
 *   - Dynamic px-per-year zoom (5–200 px/yr), centered on cursor for wheel,
 *     viewport center for buttons; pinch on macOS trackpad arrives as wheel
 *     events with e.ctrlKey, handled the same.
 *   - Drag-to-pan with the mouse; native overflow-x handles touch panning.
 *   - Extended axis bounds (subject lifespan ± 30 years) so readers can
 *     survey the surrounding period; "fit lifespan" returns to a default.
 *   - Existing chapter list still drives layout; positions recompute on
 *     every zoom change.
 *
 * No-JS fallback: the same DOM renders as a vertical list per the
 * .storytimeline (no .--interactive) CSS — per CLAUDE.md §5.5b.
 */
(function () {
  "use strict";

  var MIN_ZOOM = 5;
  var MAX_ZOOM = 200;
  var ZOOM_STEP = 1.3;
  /* Density mode thresholds (px/year): compact < COMPACT_MAX < condensed < CONDENSED_MAX <= full */
  var COMPACT_MAX   = 18;
  var CONDENSED_MAX = 35;

  function init(el) {
    var minYear = parseInt(el.dataset.minYear, 10);
    var maxYear = parseInt(el.dataset.maxYear, 10);
    var subjMin = parseInt(el.dataset.subjectMin, 10) || minYear;
    var subjMax = parseInt(el.dataset.subjectMax, 10) || maxYear;
    var pxPerYear = parseFloat(el.dataset.pxPerYear) || 50;
    if (!minYear || !maxYear) return;

    var viewport = el.querySelector(".storytimeline__viewport");
    var track    = el.querySelector(".storytimeline__track");
    var chapters = Array.from(el.querySelectorAll(".storytimeline__chapter"));
    var ticks    = Array.from(el.querySelectorAll(".storytimeline__tick"));
    var controls = el.querySelector(".storytimeline__controls");
    var prevBtn  = el.querySelector(".storytimeline__prev");
    var nextBtn  = el.querySelector(".storytimeline__next");
    var zinBtn   = el.querySelector(".storytimeline__zin");
    var zoutBtn  = el.querySelector(".storytimeline__zout");
    var zfitBtn  = el.querySelector(".storytimeline__zfit");
    var countEl  = el.querySelector(".storytimeline__count");
    var chips    = Array.from(el.querySelectorAll(".storytimeline__chip"));
    var minimap  = el.querySelector(".storytimeline__minimap");
    var mintrack = el.querySelector(".storytimeline__minitrack");
    var bracket  = el.querySelector(".storytimeline__bracket");
    var minidots = Array.from(el.querySelectorAll(".storytimeline__minidot"));
    var minitip  = el.querySelector(".storytimeline__minitip");
    var minitipY = el.querySelector(".storytimeline__minitip-year");
    var minitipT = el.querySelector(".storytimeline__minitip-title");

    el.classList.add("storytimeline--interactive");

    // Mark the subject's earliest event as the anchor (visually distinct dot)
    // so the reader can always locate "the subject's life begins here".
    var anchorIdx = chapters.findIndex(function (ch) {
      return ch.dataset.layer === "subject"
          && parseInt(ch.dataset.year, 10) === subjMin;
    });
    if (anchorIdx >= 0) {
      chapters[anchorIdx].classList.add("storytimeline__chapter--anchor");
      if (minidots[anchorIdx]) minidots[anchorIdx].classList.add("storytimeline__minidot--anchor");
    }

    var activeIndex = 0;

    function yearToX(y)    { return (y - minYear) * pxPerYear; }
    function xToYear(x)    { return minYear + x / pxPerYear; }

    function applyMode() {
      var mode = pxPerYear < COMPACT_MAX ? "compact"
               : pxPerYear < CONDENSED_MAX ? "condensed"
               : "full";
      el.classList.remove("storytimeline--mode-compact",
                          "storytimeline--mode-condensed",
                          "storytimeline--mode-full");
      el.classList.add("storytimeline--mode-" + mode);
    }

    function applyLayout() {
      applyMode();
      track.style.width = ((maxYear - minYear) * pxPerYear) + "px";
      ticks.forEach(function (t) {
        var y = parseInt(t.dataset.year, 10);
        t.style.left = yearToX(y) + "px";
      });

      // First pass: compute base x for each chapter and bucket by (side, year)
      // so we can micro-offset chapters sharing the same year (improvement #51).
      var sameYearBuckets = {};
      chapters.forEach(function (ch) {
        var y = parseInt(ch.dataset.year, 10);
        var key = ch.dataset.side + ":" + y;
        (sameYearBuckets[key] = sameYearBuckets[key] || []).push(ch);
      });

      chapters.forEach(function (ch) {
        var y = parseInt(ch.dataset.year, 10);
        var endY = parseInt(ch.dataset.endYear, 10);
        var cardW = parseFloat(getComputedStyle(ch).width) || 176;
        // Same-year offset: spread chapters that share a year on the same side
        // horizontally so they don't stack identically. Limit to ~26 px each
        // way so cards still hug the right year visually.
        var key = ch.dataset.side + ":" + y;
        var bucket = sameYearBuckets[key];
        var offset = 0;
        if (bucket && bucket.length > 1) {
          var idx = bucket.indexOf(ch);
          var spread = Math.min(26, (pxPerYear * 0.45));
          offset = (idx - (bucket.length - 1) / 2) * spread;
        }
        ch.style.left = (yearToX(y) - cardW / 2 + offset) + "px";

        // Range bar (improvement #48): position from year → end_year along the axis.
        var bar = ch.querySelector(".storytimeline__rangebar");
        if (bar) {
          if (endY && endY > y) {
            var startX = yearToX(y);
            var endX   = yearToX(endY);
            bar.style.display = "block";
            // bar lives in the chapter's coordinate space, so subtract ch.left
            // (which equals yearToX(y) - cardW/2 + offset).
            bar.style.left  = (cardW / 2 - offset) + "px";
            bar.style.width = Math.max(2, endX - startX) + "px";
          } else {
            bar.style.display = "none";
          }
        }
      });

      positionMinidots();
      updateBracket();
      avoidLabelCollision();
    }

    // In compact mode, year labels can overlap when chapters cluster. Walk
    // each side (above/below) in x-order and hide labels that would collide
    // with the previously shown one. Anchor is exempt — its label always shows.
    function avoidLabelCollision() {
      // Clear any prior decisions on every layout pass.
      chapters.forEach(function (ch) {
        ch.classList.remove("storytimeline__chapter--label-hidden");
      });
      if (!el.classList.contains("storytimeline--mode-compact")) return;
      var LABEL_W = 44;   // approximate rendered width of a four-digit year
      var GAP     = 6;
      ["above", "below"].forEach(function (side) {
        var sideChapters = chapters
          .filter(function (ch) { return ch.dataset.side === side && isVisible(ch); })
          .sort(function (a, b) { return a.offsetLeft - b.offsetLeft; });
        var lastRight = -Infinity;
        sideChapters.forEach(function (ch) {
          if (ch.classList.contains("storytimeline__chapter--anchor")) {
            // Anchor always wins — reserve its slot but never hide it.
            var c = ch.offsetLeft + ch.offsetWidth / 2;
            lastRight = c + LABEL_W / 2 + GAP;
            return;
          }
          var center = ch.offsetLeft + ch.offsetWidth / 2;
          var left = center - LABEL_W / 2;
          if (left < lastRight) {
            ch.classList.add("storytimeline__chapter--label-hidden");
          } else {
            lastRight = left + LABEL_W + GAP;
          }
        });
      });
    }

    function positionMinidots() {
      if (!mintrack) return;
      var mw = mintrack.clientWidth;
      var span = maxYear - minYear;
      if (!mw || !span) return;
      minidots.forEach(function (d) {
        var y = parseInt(d.dataset.year, 10);
        var endY = parseInt(d.dataset.endYear, 10);
        d.style.left = ((y - minYear) / span * mw) + "px";
        if (endY && endY > y) {
          // Stretch the dot into a range-bar across the minimap span.
          d.style.width = Math.max(4, ((endY - y) / span) * mw) + "px";
        }
      });
    }

    function updateBracket() {
      if (!bracket || !mintrack) return;
      var mw = mintrack.clientWidth;
      var span = maxYear - minYear;
      if (!mw || !span) return;
      var startYear = minYear + viewport.scrollLeft / pxPerYear;
      var endYear   = minYear + (viewport.scrollLeft + viewport.clientWidth) / pxPerYear;
      var left  = Math.max(0, (startYear - minYear) / span * mw);
      var right = Math.min(mw, (endYear - minYear) / span * mw);
      bracket.style.left  = left + "px";
      bracket.style.width = Math.max(4, right - left) + "px";
    }

    function setZoom(newPx, anchorClientX) {
      newPx = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newPx));
      if (newPx === pxPerYear) return;
      // Keep the year under anchorClientX in place across the zoom.
      var vpRect = viewport.getBoundingClientRect();
      var focalVpX = anchorClientX == null ? viewport.clientWidth / 2 : (anchorClientX - vpRect.left);
      var focalYear = xToYear(viewport.scrollLeft + focalVpX);
      pxPerYear = newPx;
      applyLayout();
      viewport.scrollLeft = (focalYear - minYear) * pxPerYear - focalVpX;
      updateZoomButtons();
    }

    function updateZoomButtons() {
      if (zinBtn)  zinBtn.disabled  = pxPerYear >= MAX_ZOOM - 0.5;
      if (zoutBtn) zoutBtn.disabled = pxPerYear <= MIN_ZOOM + 0.5;
    }

    function fitLifespan() {
      var span = subjMax - subjMin;
      if (span <= 0) return;
      // Fit subject lifespan into ~75% of the viewport, with margin
      var target = (viewport.clientWidth * 0.75) / span;
      setZoom(target);
      // Center the subject midpoint
      var midYear = (subjMin + subjMax) / 2;
      viewport.scrollLeft = (midYear - minYear) * pxPerYear - viewport.clientWidth / 2;
    }

    function setActive(i) {
      if (i < 0 || i >= chapters.length) return;
      activeIndex = i;
      chapters.forEach(function (ch, j) {
        ch.classList.toggle("storytimeline__chapter--active", j === i);
      });
      if (prevBtn) prevBtn.disabled = i === 0;
      if (nextBtn) nextBtn.disabled = i === chapters.length - 1;
      if (countEl) countEl.textContent = (i + 1) + " / " + chapters.length;
    }

    function centerOn(ch, opts) {
      var cardCenter = ch.offsetLeft + ch.offsetWidth / 2;
      var target = cardCenter - viewport.clientWidth / 2;
      viewport.scrollTo({ left: Math.max(0, target), behavior: (opts && opts.behavior) || "smooth" });
      setActive(parseInt(ch.dataset.index, 10));
    }

    function isVisible(ch) {
      return getComputedStyle(ch).display !== "none";
    }

    function step(delta) {
      var next = activeIndex + delta;
      while (next >= 0 && next < chapters.length) {
        if (isVisible(chapters[next])) {
          centerOn(chapters[next]);
          return;
        }
        next += delta;
      }
    }

    // Wire layer toggle chips
    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        var layer = chip.dataset.layer;
        var wasOn = chip.getAttribute("aria-pressed") === "true";
        chip.setAttribute("aria-pressed", String(!wasOn));
        el.classList.toggle("storytimeline--layer-" + layer + "-off", wasOn);
        // If the active chapter was just hidden, jump to the next visible one.
        if (chapters[activeIndex] && !isVisible(chapters[activeIndex])) {
          step(1) || step(-1);
        }
      });
    });

    // ---- Wire chapter clicks ----
    chapters.forEach(function (ch) {
      ch.querySelector(".storytimeline__card").addEventListener("click", function (e) {
        // Let image clicks open the lightbox without also re-centering the card.
        if (e.target.closest("a[data-lightbox]")) return;
        centerOn(ch);
      });
    });

    // ---- Button handlers ----
    if (controls) controls.hidden = false;
    if (prevBtn) prevBtn.addEventListener("click", function () { step(-1); });
    if (nextBtn) nextBtn.addEventListener("click", function () { step(1); });
    if (zinBtn)  zinBtn.addEventListener("click",  function () { setZoom(pxPerYear * ZOOM_STEP); });
    if (zoutBtn) zoutBtn.addEventListener("click", function () { setZoom(pxPerYear / ZOOM_STEP); });
    if (zfitBtn) zfitBtn.addEventListener("click", fitLifespan);

    // ---- Wheel: ctrl/cmd+wheel = zoom (trackpad pinch sends ctrlKey); else native scroll ----
    viewport.addEventListener("wheel", function (e) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      var factor = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      setZoom(pxPerYear * factor, e.clientX);
    }, { passive: false });

    // ---- Mouse drag to pan ----
    var isDragging = false;
    var dragStartX = 0;
    var dragStartScroll = 0;
    var didDrag = false;

    viewport.addEventListener("mousedown", function (e) {
      // Don't capture drags that start on a card — those are clicks
      if (e.target.closest(".storytimeline__card")) return;
      if (e.button !== 0) return;
      isDragging = true;
      didDrag = false;
      dragStartX = e.clientX;
      dragStartScroll = viewport.scrollLeft;
      viewport.classList.add("is-dragging");
    });

    document.addEventListener("mousemove", function (e) {
      if (!isDragging) return;
      var dx = e.clientX - dragStartX;
      if (Math.abs(dx) > 2) didDrag = true;
      viewport.scrollLeft = dragStartScroll - dx;
    });

    document.addEventListener("mouseup", function () {
      if (!isDragging) return;
      isDragging = false;
      viewport.classList.remove("is-dragging");
    });

    // ---- Active chapter follows pan + bracket follows scroll (rAF-throttled) ----
    var scrollRAF = 0;
    viewport.addEventListener("scroll", function () {
      if (scrollRAF) cancelAnimationFrame(scrollRAF);
      scrollRAF = requestAnimationFrame(function () {
        var viewCenter = viewport.scrollLeft + viewport.clientWidth / 2;
        var bestI = 0, bestDist = Infinity;
        chapters.forEach(function (ch, i) {
          var c = ch.offsetLeft + ch.offsetWidth / 2;
          var d = Math.abs(c - viewCenter);
          if (d < bestDist) { bestDist = d; bestI = i; }
        });
        if (bestI !== activeIndex) setActive(bestI);
        updateBracket();
      });
    });

    // ---- Mini-map interactions ----
    if (minimap) {
      minimap.hidden = false;

      // Click on minidot — center that specific chapter
      minidots.forEach(function (dot) {
        dot.addEventListener("click", function (e) {
          e.stopPropagation();
          var idx = parseInt(dot.dataset.index, 10);
          if (chapters[idx]) centerOn(chapters[idx]);
        });
      });

      // Hover tooltip — preview a chapter before clicking. Lets the reader
      // survey the timeline at-a-glance.
      // Hover also prefetches the full-size lightbox image (improvement #54)
      // so the lightbox feels instant when the reader clicks through.
      var prefetched = Object.create(null);
      function prefetchImg(url) {
        if (!url || prefetched[url]) return;
        prefetched[url] = true;
        var link = document.createElement("link");
        link.rel  = "prefetch";
        link.as   = "image";
        link.href = url;
        document.head.appendChild(link);
      }
      if (minitip) {
        function showTip(dot) {
          minitipY.textContent = dot.dataset.year || "";
          minitipT.textContent = dot.dataset.title || "";
          minitip.hidden = false;
          // Position tip horizontally over the dot, relative to minimap.
          var dotRect = dot.getBoundingClientRect();
          var mmRect  = minimap.getBoundingClientRect();
          minitip.style.left = (dotRect.left + dotRect.width / 2 - mmRect.left) + "px";
          if (dot.dataset.img) prefetchImg(dot.dataset.img);
        }
        function hideTip() { minitip.hidden = true; }
        minidots.forEach(function (dot) {
          dot.addEventListener("mouseenter", function () { showTip(dot); });
          dot.addEventListener("mouseleave", hideTip);
          dot.addEventListener("focus", function () { showTip(dot); });
          dot.addEventListener("blur", hideTip);
        });
        minimap.addEventListener("mouseleave", hideTip);
      } else {
        // Even without a tooltip, the prefetch is still useful on bare dots.
        minidots.forEach(function (dot) {
          dot.addEventListener("mouseenter", function () { prefetchImg(dot.dataset.img); });
          dot.addEventListener("focus",      function () { prefetchImg(dot.dataset.img); });
        });
      }

      // Click on minimap background (not bracket, not minidot) — jump to year
      minimap.addEventListener("click", function (e) {
        if (e.target === bracket || e.target.classList.contains("storytimeline__minidot")) return;
        var rect = mintrack.getBoundingClientRect();
        var span = maxYear - minYear;
        var year = minYear + (e.clientX - rect.left) / rect.width * span;
        viewport.scrollTo({
          left: (year - minYear) * pxPerYear - viewport.clientWidth / 2,
          behavior: "smooth"
        });
      });

      // Drag the bracket to pan the main viewport
      var dragBr = false;
      var dragBrStartX = 0;
      var dragBrStartScroll = 0;
      bracket.addEventListener("mousedown", function (e) {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        dragBr = true;
        dragBrStartX = e.clientX;
        dragBrStartScroll = viewport.scrollLeft;
        bracket.classList.add("is-dragging");
      });
      document.addEventListener("mousemove", function (e) {
        if (!dragBr) return;
        var mw = mintrack.clientWidth;
        var span = maxYear - minYear;
        var pxRatio = (span * pxPerYear) / mw;
        viewport.scrollLeft = dragBrStartScroll + (e.clientX - dragBrStartX) * pxRatio;
      });
      document.addEventListener("mouseup", function () {
        if (!dragBr) return;
        dragBr = false;
        bracket.classList.remove("is-dragging");
      });
    }

    // ---- Keyboard navigation (when section has focus) ----
    el.addEventListener("keydown", function (e) {
      // Only act on focus pinned to the section itself — not buttons, chips,
      // or links inside, where the browser's own handling should win.
      if (e.target !== el) return;
      switch (e.key) {
        case "ArrowLeft":  e.preventDefault(); step(-1); break;
        case "ArrowRight": e.preventDefault(); step(1); break;
        case "Home":
          e.preventDefault();
          var firstVisible = chapters.findIndex(isVisible);
          if (firstVisible >= 0) centerOn(chapters[firstVisible]);
          break;
        case "End":
          e.preventDefault();
          for (var i = chapters.length - 1; i >= 0; i--) {
            if (isVisible(chapters[i])) { centerOn(chapters[i]); break; }
          }
          break;
      }
    });

    // ---- Initial state ----
    applyLayout();
    fitLifespan();
    setActive(0);
    updateZoomButtons();
  }

  function ready() {
    document.querySelectorAll("[data-storytimeline]").forEach(init);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ready);
  } else {
    ready();
  }
})();
