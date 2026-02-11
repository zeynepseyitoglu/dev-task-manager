/**
 * Kanban: drag-and-drop + task side panel (context).
 * - Drag card to another column to update status.
 * - Click card (not dropdown/delete) to open side panel with task details and editable context.
 */
(function () {
  "use strict";

  var board = document.querySelector(".board");
  if (!board) return;

  var columns = board.querySelectorAll(".column");
  var mainInner = document.querySelector(".column-main-inner");
  var cards = mainInner ? mainInner.querySelectorAll(".card") : board.querySelectorAll(".card");

  // ---- Search: filter cards by title or type in real time (includes blocked section) ----
  var searchInput = document.getElementById("board-search");
  if (searchInput) {
    function filterCards() {
      var q = (searchInput.value || "").trim().toLowerCase();
      var allCards = mainInner ? mainInner.querySelectorAll(".card") : board.querySelectorAll(".card");
      allCards.forEach(function (card) {
        var titleEl = card.querySelector(".task-title");
        var typeEl = card.querySelector(".badge-type");
        var title = (titleEl && titleEl.textContent) ? titleEl.textContent.trim().toLowerCase() : "";
        var type = (typeEl && typeEl.textContent) ? typeEl.textContent.trim().toLowerCase() : "";
        var match = !q || title.indexOf(q) !== -1 || type.indexOf(q) !== -1;
        card.classList.toggle("card-search-hidden", !match);
      });
    }
    searchInput.addEventListener("input", filterCards);
    searchInput.addEventListener("search", filterCards);
  }

  // ---- Timeline: click item to open that task's panel ----
  document.addEventListener("click", function (e) {
    var item = e.target && e.target.closest && e.target.closest(".timeline-item");
    if (!item) return;
    e.preventDefault();
    var taskId = item.getAttribute("data-task-id");
    if (taskId) openPanel(taskId);
  });

  // ---- Side panel: show task details; editable title and description ----
  var overlay = document.getElementById("task-panel-overlay");
  var panel = document.getElementById("task-panel");
  var panelClose = document.getElementById("panel-close");
  var editForm = document.getElementById("panel-edit-form");
  var dueForm = document.getElementById("panel-due-form");
  var panelDueInput = document.getElementById("panel-due-date");
  var panelCodeLinkInput = document.getElementById("panel-code-link");
  var panelOpenLinkBtn = document.getElementById("panel-open-code-link");

  function openPanel(taskId) {
    fetch("/task/" + taskId)
      .then(function (res) {
        if (!res.ok) return;
        return res.json();
      })
      .then(function (task) {
        if (!task) return;
        var titleEl = document.getElementById("panel-task-title");
        var descEl = document.getElementById("panel-description");
        if (titleEl) titleEl.value = task.title || "";
        if (descEl) descEl.value = task.description || "";
        if (panelCodeLinkInput) panelCodeLinkInput.value = task.code_link || "";
        var panelCodeSnippet = document.getElementById("panel-code-snippet");
        if (panelCodeSnippet) panelCodeSnippet.value = task.code_snippet || "";
        var panelBlocked = document.getElementById("panel-blocked");
        if (panelBlocked) panelBlocked.checked = !!task.blocked;
        var panelBlockingReason = document.getElementById("panel-blocking-reason");
        if (panelBlockingReason) panelBlockingReason.value = task.blocking_reason || "";
        var panelTypeEl = document.getElementById("panel-type");
        if (panelTypeEl) {
          panelTypeEl.textContent = task.task_type;
          panelTypeEl.className = "badge badge-type badge-type--" + (task.task_type || "coding");
        }
        document.getElementById("panel-status").textContent = task.status;
        if (panelDueInput) panelDueInput.value = task.due_date || "";
        if (editForm) editForm.action = "/task/" + taskId + "/edit";
        if (dueForm) dueForm.action = "/task/" + taskId + "/due_date";
        overlay.setAttribute("aria-hidden", "false");
        panel.setAttribute("aria-hidden", "false");
      });
  }

  function isUrl(s) {
    if (!s || typeof s !== "string") return false;
    var t = s.trim();
    return t.indexOf("http://") === 0 || t.indexOf("https://") === 0;
  }

  function openOrCopyCodeLink(link) {
    var raw = (link || "").trim();
    if (!raw) return;
    if (isUrl(raw)) {
      window.open(raw, "_blank", "noopener,noreferrer");
    } else {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(raw).then(function () {
            if (panelOpenLinkBtn) panelOpenLinkBtn.textContent = "Copied!";
            setTimeout(function () { if (panelOpenLinkBtn) panelOpenLinkBtn.textContent = "Open"; }, 1500);
          });
        } else {
          window.prompt("Copy path:", raw);
        }
      } catch (e) {
        window.prompt("Copy path:", raw);
      }
    }
  }

  function closePanel() {
    overlay.setAttribute("aria-hidden", "true");
    panel.setAttribute("aria-hidden", "true");
  }

  if (overlay && panel) {
    overlay.addEventListener("click", closePanel);
    if (panelClose) panelClose.addEventListener("click", closePanel);
  }

  // Click on card body opens panel; ignore clicks on dropdown, delete, subtasks, collapse toggle, or code link
  cards.forEach(function (card) {
    card.addEventListener("click", function (e) {
      if (e.target.closest(".card-actions") || e.target.closest(".task-subtasks") || e.target.closest(".card-collapse-toggle") || e.target.closest(".task-code-link")) return;
      var taskId = card.getAttribute("data-task-id");
      if (taskId) openPanel(taskId);
    });
  });

  // Code link on card: open URL in new tab or copy path
  document.addEventListener("click", function (e) {
    var linkEl = e.target && e.target.closest && e.target.closest(".task-code-link");
    if (!linkEl) return;
    e.preventDefault();
    e.stopPropagation();
    var link = linkEl.getAttribute("data-code-link") || linkEl.getAttribute("href") || "";
    openOrCopyCodeLink(link);
  });

  if (panelOpenLinkBtn && panelCodeLinkInput) {
    panelOpenLinkBtn.addEventListener("click", function (e) {
      e.preventDefault();
      openOrCopyCodeLink(panelCodeLinkInput.value);
    });
  }

  // ---- Status dropdown: submit via fetch and move card in DOM (no full reload) ----
  document.addEventListener("submit", function (e) {
    var form = e.target;
    if (!form || !form.classList.contains("status-form")) return;
    var action = form.getAttribute("action");
    if (!action || action.indexOf("/status") === -1) return;
    var actionMatch = action.match(/\/task\/(\d+)\/status/);
    if (!actionMatch) return;
    e.preventDefault();
    e.stopPropagation();
    var taskId = actionMatch[1];
    var newStatus = (form.querySelector('select[name="status"]') && form.querySelector('select[name="status"]').value) || "";
    if (!newStatus) return;
    var card = form.closest(".card");
    if (!card) return;
    var targetColumn = board.querySelector('.column[data-status="' + newStatus + '"]');
    var targetList = targetColumn && targetColumn.querySelector(".column-cards");
    if (!targetList) return;
    var sourceList = card.parentNode;
    sourceList.removeChild(card);
    targetList.appendChild(card);
    var body = new FormData(form);
    var headers = { "X-Requested-With": "XMLHttpRequest", "Accept": "application/json" };
    fetch(action, { method: "POST", body: body, headers: headers })
      .then(function (res) {
        if (!res.ok) return { ok: false };
        return res.json().then(function (data) { return { ok: true }; }).catch(function () { return { ok: true }; });
      })
      .then(function (result) {
        if (result.ok) return;
        sourceList.appendChild(card);
        window.location.reload();
      })
      .catch(function () {
        sourceList.appendChild(card);
        window.location.reload();
      });
  }, true);

  // ---- Collapse toggle: expand/collapse card body ----
  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".card-collapse-toggle");
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    var card = btn.closest(".card");
    if (!card) return;
    card.classList.toggle("card--collapsed");
    var collapsed = card.classList.contains("card--collapsed");
    btn.textContent = collapsed ? "\u25b8" : "\u25be";
    btn.setAttribute("aria-expanded", collapsed ? "false" : "true");
    btn.setAttribute("title", collapsed ? "Expand" : "Collapse");
  });

  // ---- Drag: store task id and source column for reorder vs status change ----
  var sourceColumn = null;
  var lastDropIndex = null;

  cards.forEach(function (card) {
    card.addEventListener("dragstart", function (e) {
      // Don’t start a drag when the user is interacting with the dropdown or delete button
      if (e.target.closest(".card-actions") || e.target.closest(".task-subtasks") || e.target.closest(".card-collapse-toggle")) {
        e.preventDefault();
        return;
      }
      var taskId = card.getAttribute("data-task-id");
      e.dataTransfer.setData("text/plain", taskId);
      e.dataTransfer.effectAllowed = "move";
      sourceColumn = card.closest(".column");
      lastDropIndex = null;
      card.classList.add("dragging");
    });

    card.addEventListener("dragend", function () {
      card.classList.remove("dragging");
      sourceColumn = null;
      lastDropIndex = null;
      columns.forEach(function (col) {
        col.classList.remove("drag-over");
      });
    });
  });

  // ---- Drag over: allow drop and track insert index for reorder ----
  columns.forEach(function (column) {
    column.addEventListener("dragover", function (e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      column.classList.add("drag-over");

      var list = column.querySelector(".column-cards");
      if (!list) return;
      var cardsInColumn = Array.from(list.querySelectorAll(".card:not(.dragging)"));
      var overCard = e.target.closest(".card:not(.dragging)");
      lastDropIndex = overCard ? cardsInColumn.indexOf(overCard) : cardsInColumn.length;
      if (lastDropIndex < 0) lastDropIndex = cardsInColumn.length;
    });

    column.addEventListener("dragleave", function (e) {
      if (!column.contains(e.relatedTarget)) {
        column.classList.remove("drag-over");
      }
    });

    column.addEventListener("drop", function (e) {
      e.preventDefault();
      column.classList.remove("drag-over");

      var taskId = e.dataTransfer.getData("text/plain");
      var newStatus = column.getAttribute("data-status");
      if (!taskId || !newStatus) return;

      var card = document.querySelector('.card[data-task-id="' + taskId + '"]');
      var list = column.querySelector(".column-cards");
      if (!card || !list) return;

      var url;
      var body = new FormData();
      body.append("status", newStatus);

      if (column === sourceColumn) {
        var cardsInList = Array.from(list.querySelectorAll(".card"));
        var otherCards = cardsInList.filter(function (c) { return c.getAttribute("data-task-id") !== taskId; });
        var insertAt = lastDropIndex != null ? Math.min(lastDropIndex, otherCards.length) : otherCards.length;
        var newOrderIds = otherCards.map(function (c) { return c.getAttribute("data-task-id"); });
        newOrderIds.splice(insertAt, 0, taskId);
        url = "/task/reorder";
        body.append("order", newOrderIds.join(","));
      } else {
        url = "/task/" + taskId + "/status";
      }

      var sourceList = card.parentNode;
      var ref = list.children[lastDropIndex != null ? Math.min(lastDropIndex, list.children.length) : list.children.length];
      list.insertBefore(card, ref || null);
      var statusSelect = card.querySelector(".status-form select");
      if (statusSelect) statusSelect.value = newStatus;

      var headers = { "X-Requested-With": "XMLHttpRequest", "Accept": "application/json" };
      fetch(url, { method: "POST", body: body, headers: headers })
        .then(function (res) {
          if (!res.ok) return { ok: false };
          return res.json().then(function (data) { return { ok: true, data: data }; }).catch(function () { return { ok: true, data: null }; });
        })
        .then(function (result) {
          if (result.ok) return;
          window.location.reload();
        })
        .catch(function () {
          window.location.reload();
        });
    });
  });
})();
