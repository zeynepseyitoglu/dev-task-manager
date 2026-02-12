"""
Simple personal developer task manager - Flask app.
Stores tasks in a local JSON file. Single page: add tasks, Kanban board, widgets.
"""
import json
import os
from datetime import date, timedelta
from flask import Flask, jsonify, render_template, request, redirect, url_for

app = Flask(__name__)

# Path to the JSON file where tasks are stored
TASKS_FILE = "tasks.json"

# Allowed values for task type and status
TASK_TYPES = ["coding", "debugging", "learning"]
STATUSES = ["todo", "in progress", "done"]


def _valid_code_link(s):
    """Optional: accept empty; URLs must start with http/https; anything else is a path."""
    if not s or not s.strip():
        return True
    t = s.strip()
    if t.startswith("http://") or t.startswith("https://"):
        return " " not in t and len(t) > 10
    return True


def load_tasks():
    """Load tasks from the JSON file. Returns a list of task dicts."""
    if not os.path.exists(TASKS_FILE):
        return []
    with open(TASKS_FILE, "r", encoding="utf-8") as f:
        raw = json.load(f)
    tasks = []
    for t in raw:
        status = t.get("status") if t.get("status") in STATUSES else None
        if status is None and t.get("done") is True:
            status = "done"
        if status is None:
            status = "todo"
        raw_subtasks = t.get("subtasks") or []
        subtasks = []
        for s in raw_subtasks:
            if isinstance(s, dict) and "id" in s and "title" in s:
                subtasks.append({
                    "id": int(s["id"]),
                    "title": str(s.get("title", "")),
                    "done": bool(s.get("done", False)),
                })
        due = t.get("due_date")
        if due and not (isinstance(due, str) and len(due) == 10 and due[4] == "-" and due[7] == "-"):
            due = None
        order = t.get("order")
        if order is None:
            order = t["id"]
        try:
            order = int(order)
        except (TypeError, ValueError):
            order = t["id"]
        task = {
            "id": t["id"],
            "title": t.get("title", ""),
            "description": t.get("description", ""),
            "context": t.get("context", ""),
            "code_link": (t.get("code_link") or t.get("link") or "").strip(),
            "code_snippet": (t.get("code_snippet") or "").strip(),
            "task_type": t.get("task_type", "coding") if t.get("task_type") in TASK_TYPES else "coding",
            "status": status,
            "subtasks": subtasks,
            "due_date": due or None,
            "order": order,
            "blocked": bool(t.get("blocked", False)),
            "blocking_reason": (t.get("blocking_reason") or "").strip(),
            "in_sprint": bool(t.get("in_sprint", False)),
        }
        tasks.append(task)
    return tasks


def save_tasks(tasks):
    """Save the list of tasks to the JSON file."""
    with open(TASKS_FILE, "w", encoding="utf-8") as f:
        json.dump(tasks, f, indent=2)


def _ajax_ok():
    """Return True if client expects JSON (AJAX)."""
    return (
        request.headers.get("X-Requested-With") == "XMLHttpRequest"
        or "application/json" in request.headers.get("Accept", "")
    )


def _subtask_response(task_id, tasks):
    """Return JSON task if AJAX, else None (caller redirects)."""
    if request.headers.get("X-Requested-With") == "XMLHttpRequest" or "application/json" in request.headers.get("Accept", ""):
        for t in tasks:
            if t["id"] == task_id:
                return jsonify(t)
    return None


@app.route("/", methods=["GET", "POST"])
def index():
    """Single page: show all tasks and handle adding a new task."""
    tasks = load_tasks()

    if request.method == "POST":
        title = request.form.get("title", "").strip()
        description = request.form.get("description", "").strip()
        task_type = request.form.get("task_type", "coding")
        status = request.form.get("status", "todo")
        due_date = request.form.get("due_date", "").strip() or None
        code_link = request.form.get("code_link", "").strip()
        code_snippet = request.form.get("code_snippet", "").strip()
        blocked = request.form.get("blocked") == "1"
        blocking_reason = request.form.get("blocking_reason", "").strip()
        if not _valid_code_link(code_link):
            code_link = ""
        if task_type not in TASK_TYPES:
            task_type = "coding"
        if status not in STATUSES:
            status = "todo"
        if title:
            new_id = max([t["id"] for t in tasks], default=0) + 1
            max_order = max([t.get("order", 0) for t in tasks], default=0)
            tasks.append({
                "id": new_id,
                "title": title,
                "description": description,
                "task_type": task_type,
                "status": status,
                "subtasks": [],
                "due_date": due_date,
                "order": max_order + 1,
                "code_link": code_link,
                "code_snippet": code_snippet,
                "blocked": blocked,
                "blocking_reason": blocking_reason,
                "in_sprint": False,
            })
            save_tasks(tasks)
        return redirect(url_for("index"))

    today_iso = date.today().isoformat()
    due_soon_end = (date.today() + timedelta(days=3)).isoformat()
    status_order = {s: i for i, s in enumerate(STATUSES)}
    tasks = sorted(
        tasks,
        key=lambda t: (status_order.get(t["status"], 0), t.get("order", t["id"]), t["id"]),
    )
    timeline_tasks = sorted(
        [t for t in tasks if t.get("due_date")],
        key=lambda t: t["due_date"],
    )
    blocked_tasks = [t for t in tasks if t.get("blocked")]
    return render_template(
        "index.html",
        tasks=tasks,
        task_types=TASK_TYPES,
        statuses=STATUSES,
        today_iso=today_iso,
        due_soon_end_iso=due_soon_end,
        timeline_tasks=timeline_tasks,
        blocked_tasks=blocked_tasks,
    )


@app.route("/task/<int:task_id>")
def get_task(task_id):
    """Return a single task as JSON (for the side panel)."""
    tasks = load_tasks()
    for t in tasks:
        if t["id"] == task_id:
            return jsonify(t)
    return jsonify({"error": "Not found"}), 404


@app.route("/task/<int:task_id>/edit", methods=["POST"])
def update_task(task_id):
    """Update a task's title, description, code link, code snippet, blocked, blocking reason, due date."""
    title = request.form.get("title", "").strip()
    description = request.form.get("description", "").strip()
    code_link = request.form.get("code_link", "").strip()
    code_snippet = request.form.get("code_snippet", "").strip()
    blocked = "1" in request.form.getlist("blocked")
    blocking_reason = request.form.get("blocking_reason", "").strip()
    in_sprint = "1" in request.form.getlist("in_sprint")
    due_date = request.form.get("due_date", "").strip() or None
    if not _valid_code_link(code_link):
        code_link = ""
    tasks = load_tasks()
    for t in tasks:
        if t["id"] == task_id:
            if title:
                t["title"] = title
            t["description"] = description
            t["code_link"] = code_link
            t["code_snippet"] = code_snippet
            t["blocked"] = blocked
            t["blocking_reason"] = blocking_reason
            t["in_sprint"] = in_sprint
            t["due_date"] = due_date
            break
    save_tasks(tasks)
    return redirect(url_for("index"))


@app.route("/task/<int:task_id>/sprint", methods=["POST"])
def update_task_sprint(task_id):
    """Update only the task's in_sprint flag (for sprint selection mode)."""
    in_sprint = request.form.get("in_sprint") == "1" or "1" in request.form.getlist("in_sprint")
    tasks = load_tasks()
    for t in tasks:
        if t["id"] == task_id:
            t["in_sprint"] = in_sprint
            break
    save_tasks(tasks)
    if _ajax_ok():
        return jsonify({"ok": True, "in_sprint": in_sprint})
    return redirect(url_for("index"))


@app.route("/task/<int:task_id>/due_date", methods=["POST"])
def update_due_date(task_id):
    """Update a task's due date (optional; empty to clear)."""
    due_date = request.form.get("due_date", "").strip() or None
    tasks = load_tasks()
    for t in tasks:
        if t["id"] == task_id:
            t["due_date"] = due_date
            break
    save_tasks(tasks)
    return redirect(url_for("index"))


@app.route("/task/<int:task_id>/status", methods=["POST"])
def update_status(task_id):
    """Update a task's status."""
    new_status = request.form.get("status", "").strip()
    if new_status not in STATUSES:
        return redirect(url_for("index")) if not _ajax_ok() else jsonify({"error": "Invalid status"}), 400
    tasks = load_tasks()
    for t in tasks:
        if t["id"] == task_id:
            t["status"] = new_status
            break
    save_tasks(tasks)
    return jsonify({"ok": True}) if _ajax_ok() else redirect(url_for("index"))


@app.route("/task/reorder", methods=["POST"])
def reorder_tasks():
    """Reorder tasks within a status column. Form: status, order (comma-separated task ids)."""
    status = request.form.get("status", "").strip()
    order_str = request.form.get("order", "").strip()
    if status not in STATUSES or not order_str:
        return redirect(url_for("index")) if not _ajax_ok() else jsonify({"error": "Invalid"}), 400
    order_ids = []
    for s in order_str.split(","):
        s = s.strip()
        if s.isdigit():
            order_ids.append(int(s))
    if not order_ids:
        return redirect(url_for("index")) if not _ajax_ok() else jsonify({"error": "Invalid"}), 400
    tasks = load_tasks()
    by_id = {t["id"]: t for t in tasks}
    for i, tid in enumerate(order_ids):
        if tid in by_id and by_id[tid].get("status") == status:
            by_id[tid]["order"] = i
    save_tasks(tasks)
    return jsonify({"ok": True}) if _ajax_ok() else redirect(url_for("index"))


@app.route("/delete/<int:task_id>", methods=["POST"])
def delete_task(task_id):
    """Remove a task by id."""
    tasks = load_tasks()
    tasks = [t for t in tasks if t["id"] != task_id]
    save_tasks(tasks)
    return redirect(url_for("index"))


@app.route("/task/<int:task_id>/subtask", methods=["POST"])
def add_subtask(task_id):
    """Add a subtask to a task."""
    title = request.form.get("title", "").strip()
    if not title:
        if request.headers.get("X-Requested-With") == "XMLHttpRequest" or "application/json" in request.headers.get("Accept", ""):
            return jsonify({"error": "Title required"}), 400
        return redirect(url_for("index"))
    tasks = load_tasks()
    for t in tasks:
        if t["id"] == task_id:
            new_id = max([s["id"] for s in t["subtasks"]], default=0) + 1
            t["subtasks"].append({"id": new_id, "title": title, "done": False})
            break
    save_tasks(tasks)
    r = _subtask_response(task_id, load_tasks())
    return r if r is not None else redirect(url_for("index"))


@app.route("/task/<int:task_id>/subtask/<int:subtask_id>/toggle", methods=["POST"])
def toggle_subtask(task_id, subtask_id):
    """Toggle a subtask's done state."""
    tasks = load_tasks()
    for t in tasks:
        if t["id"] == task_id:
            for s in t["subtasks"]:
                if s["id"] == subtask_id:
                    s["done"] = not s["done"]
                    break
            break
    save_tasks(tasks)
    r = _subtask_response(task_id, load_tasks())
    return r if r is not None else redirect(url_for("index"))


@app.route("/task/<int:task_id>/subtask/<int:subtask_id>/delete", methods=["POST"])
def delete_subtask(task_id, subtask_id):
    """Remove a subtask."""
    tasks = load_tasks()
    for t in tasks:
        if t["id"] == task_id:
            t["subtasks"] = [s for s in t["subtasks"] if s["id"] != subtask_id]
            break
    save_tasks(tasks)
    r = _subtask_response(task_id, load_tasks())
    return r if r is not None else redirect(url_for("index"))


if __name__ == "__main__":
    app.run(debug=True, port=5000)
