/**
 * Companion pet widget: small animated pet in the right column.
 * - Idle animation via CSS.
 * - Click: wave/bounce and show a random message.
 * - Optional: reacts to task progress (subtask completed) with a happy animation.
 */
(function () {
  "use strict";

  var container = document.getElementById("pet-container");
  var character = document.getElementById("pet-character");
  var messageEl = document.getElementById("pet-message");
  if (!container || !messageEl) return;

  var clickMessages = [
    "Hello! 👋",
    "You got this!",
    "Keep going!",
    "Nice click!",
    "Meow!",
    "One step at a time.",
    "Stay focused!",
    "Hi there!",
    "Have a great day!"
  ];

  var messageTimeout = null;
  var reactionTimeout = null;

  function showMessage(text, durationMs) {
    if (messageTimeout) clearTimeout(messageTimeout);
    messageEl.textContent = text;
    messageEl.classList.add("pet-message--visible");
    messageTimeout = setTimeout(function () {
      messageEl.classList.remove("pet-message--visible");
      messageTimeout = null;
    }, durationMs || 2200);
  }

  function setReactionClass(className, removeAfterMs) {
    if (reactionTimeout) {
      clearTimeout(reactionTimeout);
      container.classList.remove("pet--wave", "pet--bounce", "pet--happy");
    }
    container.classList.add(className);
    reactionTimeout = setTimeout(function () {
      container.classList.remove(className);
      reactionTimeout = null;
    }, removeAfterMs || 800);
  }

  function onPetClick() {
    var messages = clickMessages;
    var msg = messages[Math.floor(Math.random() * messages.length)];
    showMessage(msg, 2200);
    setReactionClass(Math.random() > 0.5 ? "pet--wave" : "pet--bounce", 700);
  }

  container.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    onPetClick();
  });

  container.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onPetClick();
    }
  });

  // Optional: react when user completes a subtask (task progress)
  window.addEventListener("taskProgress", function (e) {
    var detail = (e && e.detail) || {};
    showMessage("Nice! 🎉", 2500);
    setReactionClass("pet--happy", 1300);
  });
})();
