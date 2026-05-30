(function () {
  "use strict";

  var HOVER_DELAY_MS = 350;
  var HIDE_DELAY_MS = 200;
  var POPUP_WIDTH = 320;

  var cache = new Map();
  var popup = null;
  var currentLink = null;
  var showTimer = null;
  var hideTimer = null;

  function parseWikipediaLink(href) {
    try {
      var u = new URL(href, window.location.href);
      var m = u.hostname.match(/^([a-z]{2,3})\.wikipedia\.org$/i);
      if (!m) return null;
      var pathMatch = u.pathname.match(/^\/wiki\/(.+)$/);
      if (!pathMatch) return null;
      var title = decodeURIComponent(pathMatch[1]);
      if (/^(Special|Talk|File|Category|Help|Portal|Wikipedia|User|Template):/i.test(title)) {
        return null;
      }
      return { lang: m[1].toLowerCase(), title: title };
    } catch (e) {
      return null;
    }
  }

  function fetchSummary(lang, title) {
    var key = lang + ":" + title;
    if (cache.has(key)) return cache.get(key);
    var url =
      "https://" +
      lang +
      ".wikipedia.org/api/rest_v1/page/summary/" +
      encodeURIComponent(title.replace(/ /g, "_"));
    var p = fetch(url, { headers: { Accept: "application/json" } })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .catch(function () {
        cache.delete(key);
        return null;
      });
    cache.set(key, p);
    return p;
  }

  function ensurePopup() {
    if (popup) return popup;
    popup = document.createElement("div");
    popup.className = "wiki-preview";
    popup.setAttribute("role", "tooltip");
    popup.addEventListener("mouseenter", cancelHide);
    popup.addEventListener("mouseleave", scheduleHide);
    document.body.appendChild(popup);
    return popup;
  }

  function renderPopup(data) {
    var el = ensurePopup();
    if (!data || data.type === "disambiguation" || !data.extract) {
      el.classList.remove("wiki-preview--visible");
      return;
    }
    var thumb = data.thumbnail && data.thumbnail.source ? data.thumbnail.source : "";
    var desc = data.description ? data.description : "";
    var link = data.content_urls && data.content_urls.desktop
      ? data.content_urls.desktop.page
      : "#";
    el.innerHTML =
      (thumb
        ? '<img class="wiki-preview__thumb" src="' + escapeAttr(thumb) + '" alt="" loading="lazy">'
        : "") +
      '<div class="wiki-preview__body">' +
      '<a class="wiki-preview__title" href="' + escapeAttr(link) + '" target="_blank" rel="noopener">' +
      escapeText(data.title || "") +
      "</a>" +
      (desc ? '<div class="wiki-preview__desc">' + escapeText(desc) + "</div>" : "") +
      '<div class="wiki-preview__extract">' + escapeText(data.extract) + "</div>" +
      '<div class="wiki-preview__source">From Wikipedia</div>' +
      "</div>";
  }

  function positionPopup(linkEl) {
    var el = ensurePopup();
    var rect = linkEl.getBoundingClientRect();
    var vw = document.documentElement.clientWidth;
    var vh = document.documentElement.clientHeight;
    var scrollX = window.scrollX || window.pageXOffset;
    var scrollY = window.scrollY || window.pageYOffset;
    el.style.width = POPUP_WIDTH + "px";
    el.classList.add("wiki-preview--measuring");
    el.classList.add("wiki-preview--visible");
    var ph = el.offsetHeight;
    el.classList.remove("wiki-preview--measuring");
    var left = rect.left + scrollX;
    if (left + POPUP_WIDTH + 12 > scrollX + vw) {
      left = scrollX + vw - POPUP_WIDTH - 12;
    }
    if (left < scrollX + 8) left = scrollX + 8;
    var top;
    var spaceBelow = vh - rect.bottom;
    if (spaceBelow >= ph + 12 || spaceBelow >= vh / 2) {
      top = rect.bottom + scrollY + 6;
    } else {
      top = rect.top + scrollY - ph - 6;
    }
    el.style.left = left + "px";
    el.style.top = top + "px";
  }

  function show(linkEl, parsed) {
    currentLink = linkEl;
    fetchSummary(parsed.lang, parsed.title).then(function (data) {
      if (currentLink !== linkEl) return;
      if (!data) return;
      renderPopup(data);
      positionPopup(linkEl);
    });
  }

  function hide() {
    if (popup) popup.classList.remove("wiki-preview--visible");
    currentLink = null;
  }

  function scheduleShow(linkEl, parsed) {
    cancelHide();
    clearTimeout(showTimer);
    showTimer = setTimeout(function () { show(linkEl, parsed); }, HOVER_DELAY_MS);
  }

  function scheduleHide() {
    clearTimeout(showTimer);
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hide, HIDE_DELAY_MS);
  }

  function cancelHide() { clearTimeout(hideTimer); }

  function escapeText(s) {
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function escapeAttr(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function attach() {
    var links = document.querySelectorAll('a[href*="wikipedia.org/wiki/"]');
    links.forEach(function (a) {
      if (a.dataset.wikiPreviewBound) return;
      var parsed = parseWikipediaLink(a.href);
      if (!parsed) return;
      a.dataset.wikiPreviewBound = "1";
      a.addEventListener("mouseenter", function () { scheduleShow(a, parsed); });
      a.addEventListener("mouseleave", scheduleHide);
      a.addEventListener("focus", function () { scheduleShow(a, parsed); });
      a.addEventListener("blur", scheduleHide);
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") hide();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attach);
  } else {
    attach();
  }
})();
