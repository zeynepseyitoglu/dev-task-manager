/**
 * Daily motivational quote widget.
 * Picks one quote per day from a local array; same quote all day.
 */
(function () {
  "use strict";

  var QUOTES = [
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
    { text: "Quality is not an act, it is a habit.", author: "Aristotle" },
    { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
    { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
    { text: "Whether you think you can or you think you can't, you're right.", author: "Henry Ford" },
    { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese proverb" },
    { text: "Your limitation—it's only your imagination.", author: "Unknown" },
    { text: "Great things never come from comfort zones.", author: "Unknown" },
    { text: "Dream it. Wish it. Do it.", author: "Unknown" },
    { text: "Success doesn't just find you. You have to go out and get it.", author: "Unknown" },
    { text: "The harder you work for something, the greater you'll feel when you achieve it.", author: "Unknown" },
    { text: "Dream bigger. Do more.", author: "Unknown" },
    { text: "Do something today that your future self will thank you for.", author: "Unknown" },
    { text: "Little things make big days.", author: "Unknown" },
    { text: "It's going to be hard, but hard does not mean impossible.", author: "Unknown" },
    { text: "Don't stop when you're tired. Stop when you're done.", author: "Unknown" },
    { text: "Wake up with determination. Go to bed with satisfaction.", author: "Unknown" },
    { text: "Do it now. Sometimes 'later' becomes 'never'.", author: "Unknown" },
    { text: "Every next level of your life will demand a different you.", author: "Unknown" },
  ];

  function dayKey() {
    var d = new Date();
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }

  function hashString(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) {
      h = ((h << 5) - h) + str.charCodeAt(i);
      h = h & h;
    }
    return Math.abs(h);
  }

  function quoteForToday() {
    var key = dayKey();
    var index = hashString(key) % QUOTES.length;
    return QUOTES[index];
  }

  var textEl = document.getElementById("quote-text");
  var authorEl = document.getElementById("quote-author");
  if (!textEl || !authorEl) return;

  var q = quoteForToday();
  textEl.textContent = q.text;
  authorEl.textContent = q.author ? "— " + q.author : "";
  authorEl.style.display = q.author ? "block" : "none";
})();
