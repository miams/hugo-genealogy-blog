(function () {
  "use strict";

  function mark() {
    var els = document.querySelectorAll(
      "article figure.post-figure:not(.is-full):not(.is-row), article picture:not(figure picture)"
    );
    els.forEach(function (el, i) {
      el.dataset.float = i % 2 === 0 ? "right" : "left";
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mark);
  } else {
    mark();
  }
})();
