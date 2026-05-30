(function () {
  "use strict";

  var overlay = null;
  var imgEl = null;
  var captionEl = null;
  var closeBtn = null;
  var pageImages = [];
  var currentIndex = -1;

  function build() {
    if (overlay) return;
    overlay = document.createElement("div");
    overlay.className = "lightbox";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.innerHTML =
      '<button class="lightbox__close" aria-label="Close">&times;</button>' +
      '<button class="lightbox__nav lightbox__nav--prev" aria-label="Previous">&#x2039;</button>' +
      '<button class="lightbox__nav lightbox__nav--next" aria-label="Next">&#x203A;</button>' +
      '<img class="lightbox__img" alt="">' +
      '<div class="lightbox__caption"></div>';
    document.body.appendChild(overlay);

    imgEl = overlay.querySelector(".lightbox__img");
    captionEl = overlay.querySelector(".lightbox__caption");
    closeBtn = overlay.querySelector(".lightbox__close");
    var prevBtn = overlay.querySelector(".lightbox__nav--prev");
    var nextBtn = overlay.querySelector(".lightbox__nav--next");

    closeBtn.addEventListener("click", close);
    prevBtn.addEventListener("click", function (e) { e.stopPropagation(); navigate(-1); });
    nextBtn.addEventListener("click", function (e) { e.stopPropagation(); navigate(1); });
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close();
    });
    imgEl.addEventListener("click", function (e) { e.stopPropagation(); });
  }

  function open(index) {
    build();
    currentIndex = index;
    var info = pageImages[index];
    imgEl.src = info.src;
    imgEl.alt = info.alt;
    captionEl.textContent = info.caption;
    captionEl.style.display = info.caption ? "block" : "none";
    overlay.classList.add("lightbox--visible");
    document.documentElement.style.overflow = "hidden";
    updateNavVisibility();
  }

  function close() {
    if (!overlay) return;
    overlay.classList.remove("lightbox--visible");
    document.documentElement.style.overflow = "";
    imgEl.src = "";
    currentIndex = -1;
  }

  function navigate(delta) {
    if (currentIndex < 0) return;
    var next = currentIndex + delta;
    if (next < 0 || next >= pageImages.length) return;
    open(next);
  }

  function updateNavVisibility() {
    if (!overlay) return;
    overlay.querySelector(".lightbox__nav--prev").style.visibility = currentIndex > 0 ? "visible" : "hidden";
    overlay.querySelector(".lightbox__nav--next").style.visibility = currentIndex < pageImages.length - 1 ? "visible" : "hidden";
  }

  function collect() {
    var article = document.querySelector("article, main");
    if (!article) return;
    var imgs = article.querySelectorAll("img");
    imgs.forEach(function (img) {
      // Skip tiny images (likely icons), already-bound, and cover thumbnails
      if (img.dataset.lightboxBound) return;
      if (img.closest(".post-cover, .cover, .entry-cover")) return;
      // Skip very small intrinsic images (icons, decorations)
      if (img.naturalWidth && img.naturalWidth < 200) return;
      img.dataset.lightboxBound = "1";
      img.style.cursor = "zoom-in";
      img.addEventListener("click", function () {
        var idx = pageImages.findIndex(function (p) { return p.src === img.currentSrc || p.src === img.src; });
        if (idx < 0) {
          pageImages.push({ src: img.currentSrc || img.src, alt: img.alt || "", caption: img.title || img.alt || "" });
          idx = pageImages.length - 1;
        }
        open(idx);
      });
      pageImages.push({
        src: img.currentSrc || img.src,
        alt: img.alt || "",
        caption: img.title || img.alt || "",
      });
    });
  }

  document.addEventListener("keydown", function (e) {
    if (!overlay || !overlay.classList.contains("lightbox--visible")) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft") navigate(-1);
    else if (e.key === "ArrowRight") navigate(1);
  });

  function init() {
    collect();
    // Re-collect after images load (for natural-width filtering)
    setTimeout(collect, 1500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
