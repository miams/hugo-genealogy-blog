/*
 * drop-cap.js — wraps the first letter of the lede paragraph in a span so
 * CSS can style only that one character (not the apostrophe / punctuation
 * that the ::first-letter pseudo-element would otherwise include per spec).
 *
 * Walks down the first paragraph's text nodes until a non-whitespace
 * character is found, then splits the text node and wraps the single
 * character in <span class="drop-cap">. Skips if a drop-cap span already
 * exists (so reruns are idempotent).
 */
(function () {
  "use strict";

  function dropCap(p) {
    if (!p || p.querySelector(".drop-cap")) return;

    var walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT, null);
    var node;
    while ((node = walker.nextNode())) {
      var text = node.nodeValue;
      var i = 0;
      while (i < text.length && /\s/.test(text[i])) i++;
      if (i >= text.length) continue;       // all whitespace — try next node
      var ch = text[i];
      // Don't drop-cap on a punctuation-only opener
      if (!/[\p{L}\p{N}]/u.test(ch)) return;

      var before = text.slice(0, i);
      var after  = text.slice(i + 1);
      var parent = node.parentNode;

      if (before) parent.insertBefore(document.createTextNode(before), node);
      var span = document.createElement("span");
      span.className = "drop-cap";
      span.textContent = ch;
      parent.insertBefore(span, node);
      node.nodeValue = after;
      return;
    }
  }

  function init() {
    document.querySelectorAll(".post__body > p:first-of-type").forEach(dropCap);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
