/**
 * Pomodoro timer: persists state so it survives page reloads (add/update task).
 * Uses localStorage for phase, remaining time, running state, and end-time.
 * Calm alarm when focus or break ends. Session count also in localStorage.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "pomodoroSessions";
  var TIMER_STATE_KEY = "pomodoroTimerState";
  var BOX_UI_KEY = "pomodoroBoxUI";

  var box = document.getElementById("pomodoro-box");
  var header = document.getElementById("pomodoro-header");
  var collapseBtn = document.getElementById("pomodoro-collapse");
  var tomatoBtn = document.getElementById("pomodoro-tomato");
  var focusInput = document.getElementById("pomodoro-focus");
  var breakInput = document.getElementById("pomodoro-break");
  var phaseEl = document.getElementById("pomodoro-phase");
  var timeEl = document.getElementById("pomodoro-time");
  var startBtn = document.getElementById("pomodoro-start");
  var resetBtn = document.getElementById("pomodoro-reset");
  var sessionsEl = document.getElementById("pomodoro-sessions");

  if (!box || !timeEl) return;

  var inLayout = box.classList.contains("pomodoro-box--in-layout") || box.closest(".widgets-column");

  var BOX_WIDTH = 200;
  var BOX_HEIGHT_COLLAPSED = 48;
  var MARGIN = 24;

  var state = {
    phase: "focus",
    remainingSeconds: 25 * 60,
    isRunning: false,
    endTime: null, // when running: ms timestamp when current phase ends
    intervalId: null,
    sessionCount: 0,
  };

  /** Box position and collapsed state (persisted). */
  function getDefaultPosition() {
    return {
      left: window.innerWidth - BOX_WIDTH - MARGIN,
      top: window.innerHeight - 280 - MARGIN,
    };
  }

  function loadBoxState() {
    if (inLayout) {
      try {
        var raw = localStorage.getItem(BOX_UI_KEY);
        if (raw) {
          var payload = JSON.parse(raw);
          if (payload.collapsed) {
            box.classList.add("pomodoro-box--collapsed");
            if (tomatoBtn) tomatoBtn.setAttribute("aria-hidden", "false");
          }
        }
      } catch (e) {}
      return;
    }
    try {
      var raw = localStorage.getItem(BOX_UI_KEY);
      if (!raw) {
        var pos = getDefaultPosition();
        box.style.left = pos.left + "px";
        box.style.top = pos.top + "px";
        return;
      }
      var payload = JSON.parse(raw);
      var left = typeof payload.left === "number" ? payload.left : getDefaultPosition().left;
      var top = typeof payload.top === "number" ? payload.top : getDefaultPosition().top;
      box.style.left = Math.max(0, Math.min(left, window.innerWidth - BOX_WIDTH)) + "px";
      box.style.top = Math.max(0, Math.min(top, window.innerHeight - BOX_HEIGHT_COLLAPSED)) + "px";
      if (payload.collapsed) {
        box.classList.add("pomodoro-box--collapsed");
        if (tomatoBtn) tomatoBtn.setAttribute("aria-hidden", "false");
      }
    } catch (e) {
      var pos = getDefaultPosition();
      box.style.left = pos.left + "px";
      box.style.top = pos.top + "px";
    }
  }

  function saveBoxState() {
    var payload = { collapsed: box.classList.contains("pomodoro-box--collapsed") };
    if (!inLayout) {
      var left = parseInt(box.style.left, 10);
      var top = parseInt(box.style.top, 10);
      if (isNaN(left) || isNaN(top)) {
        var pos = getDefaultPosition();
        left = pos.left;
        top = pos.top;
      }
      payload.left = Math.max(0, Math.min(left, window.innerWidth - 50));
      payload.top = Math.max(0, Math.min(top, window.innerHeight - 50));
    }
    try {
      localStorage.setItem(BOX_UI_KEY, JSON.stringify(payload));
    } catch (e) {}
  }

  function collapse() {
    box.classList.add("pomodoro-box--collapsed");
    if (tomatoBtn) tomatoBtn.setAttribute("aria-hidden", "false");
    saveBoxState();
  }

  function expand() {
    box.classList.remove("pomodoro-box--collapsed");
    if (tomatoBtn) tomatoBtn.setAttribute("aria-hidden", "true");
    saveBoxState();
  }

  /** Drag to move box (skip when in layout sidebar). */
  function initDrag() {
    if (inLayout || !header) return;
    var dragStartX, dragStartY, boxStartLeft, boxStartTop;

    header.addEventListener("mousedown", function (e) {
      if (e.target === collapseBtn || e.target === tomatoBtn || box.classList.contains("pomodoro-box--collapsed")) return;
      e.preventDefault();
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      boxStartLeft = parseInt(box.style.left, 10) || 0;
      boxStartTop = parseInt(box.style.top, 10) || 0;

      function onMove(e) {
        var dx = e.clientX - dragStartX;
        var dy = e.clientY - dragStartY;
        var left = Math.max(0, Math.min(boxStartLeft + dx, window.innerWidth - 50));
        var top = Math.max(0, Math.min(boxStartTop + dy, window.innerHeight - 50));
        box.style.left = left + "px";
        box.style.top = top + "px";
      }

      function onUp() {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        saveBoxState();
      }

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  }

  /** Calm alarm: soft chime when focus or break ends (Web Audio, no file). */
  var ALARM_DURATION = 1.0;
  function playAlarm() {
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      var ctx = new Ctx();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = 523;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + ALARM_DURATION);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + ALARM_DURATION);
    } catch (e) {}
  }

  function loadSessionCount() {
    var stored = localStorage.getItem(STORAGE_KEY);
    state.sessionCount = stored ? parseInt(stored, 10) : 0;
    if (isNaN(state.sessionCount)) state.sessionCount = 0;
  }

  function saveSessionCount() {
    localStorage.setItem(STORAGE_KEY, String(state.sessionCount));
  }

  function saveTimerState() {
    var focusMin = parseInt(focusInput.value, 10);
    var breakMin = parseInt(breakInput.value, 10);
    var payload = {
      phase: state.phase,
      remainingSeconds: state.remainingSeconds,
      isRunning: state.isRunning,
      endTime: state.isRunning && state.endTime ? state.endTime : null,
      focusMin: isNaN(focusMin) ? 25 : Math.min(60, Math.max(1, focusMin)),
      breakMin: isNaN(breakMin) ? 5 : Math.min(30, Math.max(1, breakMin)),
    };
    try {
      localStorage.setItem(TIMER_STATE_KEY, JSON.stringify(payload));
    } catch (e) {}
  }

  function loadTimerState() {
    try {
      var raw = localStorage.getItem(TIMER_STATE_KEY);
      if (!raw) return;
      var payload = JSON.parse(raw);
      var focusMin = payload.focusMin;
      var breakMin = payload.breakMin;
      if (typeof focusMin === "number" && focusMin >= 1 && focusMin <= 60) {
        focusInput.value = focusMin;
      }
      if (typeof breakMin === "number" && breakMin >= 1 && breakMin <= 30) {
        breakInput.value = breakMin;
      }
      state.phase = payload.phase === "break" ? "break" : "focus";
      state.remainingSeconds =
        typeof payload.remainingSeconds === "number" && payload.remainingSeconds >= 0
          ? payload.remainingSeconds
          : getFocusSeconds();
      state.isRunning = !!payload.isRunning;
      state.endTime = payload.endTime || null;
    } catch (e) {}
  }

  function formatTime(seconds) {
    var m = Math.floor(seconds / 60);
    var s = seconds % 60;
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }

  function getFocusSeconds() {
    var n = parseInt(focusInput.value, 10);
    return isNaN(n) || n < 1 ? 25 * 60 : Math.min(60, n) * 60;
  }

  function getBreakSeconds() {
    var n = parseInt(breakInput.value, 10);
    return isNaN(n) || n < 1 ? 5 * 60 : Math.min(30, n) * 60;
  }

  function render() {
    phaseEl.textContent = state.phase === "focus" ? "Focus" : "Break";
    timeEl.textContent = formatTime(state.remainingSeconds);
    if (sessionsEl) sessionsEl.textContent = "Sessions: " + state.sessionCount;
  }

  function resetSessionCount() {
    state.sessionCount = 0;
    saveSessionCount();
    render();
  }

  /** Switch to next phase. skipAlarm/skipSessionIncrement: true when catching up after reload. */
  function switchPhase(skipAlarm, skipSessionIncrement) {
    if (!skipAlarm) playAlarm();
    if (state.phase === "focus") {
      if (!skipSessionIncrement) {
        state.sessionCount += 1;
        saveSessionCount();
      }
      state.phase = "break";
      state.remainingSeconds = getBreakSeconds();
    } else {
      state.phase = "focus";
      state.remainingSeconds = getFocusSeconds();
    }
    if (state.isRunning) {
      state.endTime = Date.now() + state.remainingSeconds * 1000;
      saveTimerState();
    }
    render();
  }

  function tick() {
    state.remainingSeconds -= 1;
    if (state.remainingSeconds <= 0) {
      switchPhase(false, false);
    }
    render();
  }

  function start() {
    if (state.isRunning) return;
    state.isRunning = true;
    state.endTime = Date.now() + state.remainingSeconds * 1000;
    saveTimerState();
    startBtn.textContent = "Pause";
    state.intervalId = setInterval(tick, 1000);
  }

  function pause() {
    if (!state.isRunning) return;
    state.isRunning = false;
    state.endTime = null;
    saveTimerState();
    startBtn.textContent = "Start";
    if (state.intervalId) {
      clearInterval(state.intervalId);
      state.intervalId = null;
    }
  }

  function reset() {
    pause();
    state.phase = "focus";
    state.remainingSeconds = getFocusSeconds();
    saveTimerState();
    render();
  }

  /** Restore timer from localStorage and restart interval if it was running. */
  function restoreAfterLoad() {
    loadSessionCount();
    loadTimerState();

    if (state.isRunning && state.endTime) {
      var now = Date.now();
      state.remainingSeconds = Math.ceil((state.endTime - now) / 1000);

      while (state.remainingSeconds <= 0) {
        switchPhase(true, false);
        now = Date.now();
        state.remainingSeconds = Math.ceil((state.endTime - now) / 1000);
      }

      if (state.remainingSeconds > 0) {
        state.isRunning = true;
        startBtn.textContent = "Pause";
        state.intervalId = setInterval(tick, 1000);
      } else {
        state.isRunning = false;
        state.endTime = null;
        startBtn.textContent = "Start";
      }
    } else {
      state.isRunning = false;
      state.endTime = null;
      startBtn.textContent = "Start";
    }

    render();
  }

  loadBoxState();
  if (!inLayout) initDrag();
  restoreAfterLoad();

  if (collapseBtn) {
    collapseBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      collapse();
    });
  }
  if (tomatoBtn) {
    tomatoBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      expand();
    });
  }

  startBtn.addEventListener("click", function () {
    if (state.isRunning) pause();
    else start();
  });

  resetBtn.addEventListener("click", reset);

  var resetSessionsBtn = document.getElementById("pomodoro-reset-sessions");
  if (resetSessionsBtn) {
    resetSessionsBtn.addEventListener("click", function (e) {
      e.preventDefault();
      resetSessionCount();
    });
  }

  focusInput.addEventListener("change", function () {
    if (!state.isRunning && state.phase === "focus") {
      state.remainingSeconds = getFocusSeconds();
      saveTimerState();
      render();
    }
  });

  breakInput.addEventListener("change", function () {
    if (!state.isRunning && state.phase === "break") {
      state.remainingSeconds = getBreakSeconds();
      saveTimerState();
      render();
    }
  });
})();
