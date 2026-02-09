/**
 * Subtask forms: submit via fetch and update the card in place (no full reload).
 */
(function () {
  "use strict";

  function escapeHtml(s) {
    var div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function renderSubtasksSection(task) {
    var st = task.subtasks || [];
    var done = st.filter(function (s) { return s.done; }).length;
    var total = st.length;
    var taskId = task.id;
    var progressHtml = "";
    if (total > 0) {
      var pct = total ? Math.round((100 * done) / total) : 0;
      progressHtml =
        '<div class="task-progress" title="' + done + "/" + total + ' subtasks done">' +
        '<div class="task-progress-bar" style="width:' + pct + '%"></div>' +
        '<span class="task-progress-text">' + done + "/" + total + "</span>" +
        "</div>";
    }
    var listHtml = "";
    st.forEach(function (s) {
      var doneClass = s.done ? " subtask-done" : "";
      var check = s.done ? "✓" : "";
      var label = s.done ? "Mark incomplete" : "Mark done";
      listHtml +=
        '<li class="subtask-item' + doneClass + '">' +
        '<form method="post" action="/task/' + taskId + "/subtask/" + s.id + '/toggle" class="subtask-toggle-form">' +
        '<button type="submit" class="subtask-checkbox" title="' + escapeHtml(label) + '" aria-label="' + escapeHtml(label) + '">' + check + "</button>" +
        "</form>" +
        '<span class="subtask-title">' + escapeHtml(s.title) + "</span>" +
        '<form method="post" action="/task/' + taskId + "/subtask/" + s.id + '/delete" class="subtask-delete-form">' +
        '<button type="submit" class="subtask-delete" title="Remove subtask">×</button>' +
        "</form>" +
        "</li>";
    });
    var addFormHtml =
      '<form method="post" action="/task/' + taskId + '/subtask" class="subtask-add-form">' +
      '<input type="text" name="title" placeholder="Add subtask…" class="subtask-add-input">' +
      '<button type="submit" class="subtask-add-btn">Add</button>' +
      "</form>";
    return {
      progress: progressHtml,
      inner: '<ul class="subtask-list">' + listHtml + "</ul>" + addFormHtml,
    };
  }

  function updateCard(task) {
    var card = document.querySelector('.card[data-task-id="' + task.id + '"]');
    if (!card) return;
    var body = card.querySelector(".card-body");
    if (!body) return;
    var existingProgress = body.querySelector(".task-progress");
    if (existingProgress) existingProgress.remove();
    var section = renderSubtasksSection(task);
    if (section.progress) {
      var wrap = document.createElement("div");
      wrap.innerHTML = section.progress;
      var progressEl = wrap.firstChild;
      var subtasksEl = body.querySelector(".task-subtasks");
      body.insertBefore(progressEl, subtasksEl);
    }
    var subtasksEl = body.querySelector(".task-subtasks");
    if (subtasksEl) subtasksEl.innerHTML = section.inner;
  }

  function optimisticToggle(form) {
    var item = form.closest(".subtask-item");
    var btn = form.querySelector("button.subtask-checkbox");
    var progressBar = form.closest(".card") && form.closest(".card").querySelector(".task-progress-bar");
    var progressText = form.closest(".card") && form.closest(".card").querySelector(".task-progress-text");
    if (!item || !btn) return;
    var wasDone = item.classList.contains("subtask-done");
    item.classList.toggle("subtask-done");
    btn.textContent = wasDone ? "" : "✓";
    btn.title = wasDone ? "Mark done" : "Mark incomplete";
    btn.setAttribute("aria-label", btn.title);
    if (progressBar && progressText) {
      var list = form.closest(".task-subtasks").querySelector(".subtask-list");
      var total = list ? list.querySelectorAll(".subtask-item").length : 0;
      var done = list ? list.querySelectorAll(".subtask-item.subtask-done").length : 0;
      var pct = total ? Math.round((100 * done) / total) : 0;
      progressBar.style.width = pct + "%";
      progressText.textContent = done + "/" + total;
    }
  }

  document.addEventListener("submit", function (e) {
    var form = e.target;
    if (!form || !form.closest || !form.closest(".task-subtasks")) return;
    e.preventDefault();
    e.stopPropagation();
    var action = form.getAttribute("action");
    if (!action) return;
    var card = form.closest(".card");
    var taskId = card && card.getAttribute("data-task-id");
    if (!taskId) return;

    var isToggle = form.classList.contains("subtask-toggle-form");
    if (isToggle) {
      optimisticToggle(form);
    }

    var body = new FormData(form);
    var headers = { "X-Requested-With": "XMLHttpRequest", "Accept": "application/json" };

    fetch(action, { method: "POST", body: body, headers: headers })
      .then(function (res) {
        if (!res.ok) return null;
        return res.json();
      })
      .then(function (task) {
        if (!task) return;
        if (!isToggle) {
          updateCard(task);
        } else {
          window.dispatchEvent(new CustomEvent("taskProgress", { detail: { task: task } }));
        }
        if (form.classList.contains("subtask-add-form")) {
          var input = form.querySelector('input[name="title"]');
          if (input) input.value = "";
        }
      })
      .catch(function () {
        window.location.reload();
      });
  }, true);
})();
