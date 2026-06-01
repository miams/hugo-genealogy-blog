/*
 * theme.js — heirloom dark-mode toggle.
 * The no-flash setter that runs in <head> handles initial state. This file
 * just wires up the toggle button(s) marked with [data-theme-toggle].
 */
(function () {
  "use strict";

  var STORAGE_KEY = "heirloom-theme";
  var root = document.documentElement;

  function syncToggles(theme) {
    var next = theme === "dark" ? "light" : "dark";
    document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
      btn.setAttribute("aria-label", "Switch to " + next + " mode");
      btn.setAttribute("aria-pressed", String(theme === "dark"));
    });
  }

  function setTheme(theme, persist) {
    root.setAttribute("data-theme", theme);
    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) {}
    }
    syncToggles(theme);
  }

  function init() {
    syncToggles(root.getAttribute("data-theme") || "light");
    document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var cur = root.getAttribute("data-theme") || "light";
        setTheme(cur === "dark" ? "light" : "dark", true);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
