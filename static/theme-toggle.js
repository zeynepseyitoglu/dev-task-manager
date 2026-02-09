/**
 * Dark mode toggle with localStorage persistence.
 * Sets data-theme="dark" or removes it for light; smooth transition via CSS.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "taskManagerTheme";
  var toggle = document.getElementById("theme-toggle");

  function getStored() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function setStored(value) {
    try {
      if (value) {
        localStorage.setItem(STORAGE_KEY, value);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {}
  }

  function isDark() {
    return document.documentElement.getAttribute("data-theme") === "dark";
  }

  function applyTheme(dark) {
    if (dark) {
      document.documentElement.setAttribute("data-theme", "dark");
      setStored("dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
      setStored("light");
    }
  }

  function init() {
    var stored = getStored();
    if (stored === "dark" || stored === "light") {
      applyTheme(stored === "dark");
    } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      applyTheme(true);
    } else {
      applyTheme(false);
    }
  }

  function handleClick() {
    applyTheme(!isDark());
  }

  init();

  if (toggle) {
    toggle.addEventListener("click", handleClick);
  }

  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function (e) {
      if (getStored() === null) {
        applyTheme(e.matches);
      }
    });
  }
})();
