# Developer Task Manager

A personal task management web app for developers. Manage tasks on a Kanban board, link tasks to code or repos, and use built-in widgets (Pomodoro timer, quotes, companion pet) without leaving the page.

---

## 1. App Description

**Developer Task Manager** is a single-page Flask app that lets you add, edit, and track tasks locally. All data is stored in a JSON file on your machine—no database or account required.

### Main features

- **Three-column layout**
  - **Left:** Add Task form (title, description, type, status, due date, code link).
  - **Middle:** Kanban board with columns (Todo, In progress, Done), search, timeline by due date, and drag-and-drop.
  - **Right:** Widgets column with Pomodoro timer, daily motivational quote, and companion pet.

- **Kanban board**
  - Move tasks between columns by dragging cards or using the status dropdown.
  - Reorder tasks within a column by dragging.
  - Collapse/expand cards; search by title or type.

- **Tasks**
  - Add tasks with type (coding, debugging, learning), status, and due date.
  - Edit title and description in the side panel; update due date and code link there too.
  - Subtasks with checkboxes; progress bar shows completion.
  - Delete tasks via the × button on the card.

- **Developer-specific features**
  - **Code link:** Attach a file path, module name, or GitHub/GitLab URL to a task. Click the link on the card to open the URL in a new tab or copy the path to the clipboard.
  - Code links are shown on the card (truncated) and are editable in the task panel.

- **Widgets**
  - **Pomodoro:** Configurable focus/break durations, session count, and optional alarm when a focus session ends.
  - **Quote of the day:** One motivational quote per day from a local list.
  - **Companion pet:** Small animated pet; click for messages and reactions; it reacts when you complete subtasks.

- **Dark mode**
  - Theme toggle in the header; preference is saved in `localStorage` and respects system preference when not set.

---

## 2. Tech Stack

| Layer        | Technology |
|-------------|------------|
| **Backend** | Python 3, Flask |
| **Frontend**| Vanilla JavaScript (no React or other framework) |
| **Styling** | Plain CSS with custom properties (light/dark theme) |
| **Templates** | Jinja2 (Flask) |
| **Persistence** | Local JSON file (`tasks.json`) for tasks; `localStorage` for Pomodoro state, theme, and pet/UI state |
| **Kanban**  | Custom drag-and-drop and DOM updates; status/reorder via fetch (no external Kanban library) |
| **Pomodoro**| Custom timer logic and Web Audio API for alarm |
| **Animations** | CSS keyframes (pet idle, wave, bounce, happy; theme transitions) |

No npm, no build step: run the Flask server and open the app in the browser.

---

## 3. Installation

### Prerequisites

- **Python 3.8+**  
  Check: `python --version` or `python3 --version`.

### Step-by-step

#### 1. Clone or download the project

```bash
cd path/to/cursor-tutorial
```

#### 2. Create a virtual environment (recommended)

**Windows (Command Prompt):**
```cmd
python -m venv venv
venv\Scripts\activate
```

**Windows (PowerShell):**
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

**macOS / Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

#### 3. Install dependencies

```bash
pip install -r requirements.txt
```

#### 4. Run the app

```bash
python app.py
```

Or, if you use the `flask` CLI:

```bash
flask --app app run
```

#### 5. Open in the browser

Go to **http://127.0.0.1:5000** (or the URL shown in the terminal).

---

## 4. Usage

### Adding tasks

1. In the **left column**, fill in **Task title** (required) and optionally **Description**, **Type**, **Status**, **Due date**, and **Code link** (file path, module, or GitHub/GitLab URL).
2. Click **Add Task**. The new task appears in the Kanban column for the chosen status.

### Moving and reordering tasks

- **Change status:** Use the **dropdown** on the card to move the task to Todo, In progress, or Done. Or **drag** the card into another column.
- **Reorder:** **Drag** a card up or down within the same column to reorder. Order is saved automatically.

### Using the task panel

- **Click** a task card (not the dropdown, delete button, or code link) to open the **side panel**.
- Edit **Title**, **Description**, or **Code link** and click **Save**.
- Change **Due date** and click **Save**.
- Use **Open** next to Code link to open the URL in a new tab or copy the path.

### Code linking (developer features)

- **On the card:** If a task has a code link, a link icon and truncated path/URL appear in the meta row. **Click** it to open the URL in a new tab or copy the path.
- **In the panel:** Edit the **Code link** field and click **Save**. Use **Open** to open or copy the link.

### Widgets

- **Pomodoro:** Set Focus and Break minutes, click **Start**. When a focus session ends, the session count increments and the alarm plays. Use **Reset** to clear the timer; **Reset** next to “Sessions” to zero the count.
- **Quote:** The quote updates once per day; no interaction needed.
- **Companion pet:** **Click** the pet for a random message and a wave/bounce. Complete a subtask (checkbox) to see a “Nice! 🎉” reaction.

### Dark mode

- Click the **sun/moon** icon in the header to toggle light/dark theme. The choice is saved and used on the next visit.

### Subtasks

- **Add:** Type in “Add subtask…” and click **Add**.
- **Complete:** Click the checkbox next to a subtask to mark it done (progress bar updates).
- **Remove:** Click the × next to a subtask to delete it.

---

## 5. Test Cases / Example Usage

Use these scenarios to verify core behavior.

### Scenario 1: Add a task with a code link

**Steps:**

1. In the Add Task form, enter title: `Fix login bug`.
2. Set Type: `debugging`, Status: `todo`.
3. In Code link, enter: `https://github.com/me/myapp/blob/main/auth/login.py`.
4. Click **Add Task**.

**Expected:** A new card “Fix login bug” appears in the Todo column. The card shows a link icon and a truncated GitHub URL. Clicking the link opens the repo file in a new tab.

---

### Scenario 2: Move a task through Kanban and complete subtasks

**Steps:**

1. Add a task “Implement search” in Todo.
2. Open the task panel, add two subtasks: “Backend API” and “Frontend UI”.
3. Close the panel. Drag the card to **In progress**.
4. Check the box for “Backend API”, then for “Frontend UI”.

**Expected:** The card moves to In progress without a full page reload. The progress bar shows 0/2, then 1/2, then 2/2. The companion pet shows a “Nice! 🎉” reaction when each subtask is completed. You can drag the card to Done when finished.

---

### Scenario 3: Edit task and code link in the panel

**Steps:**

1. Add a task “Refactor utils” with Code link: `src/utils/helpers.js`.
2. Click the task to open the panel.
3. Change Code link to: `src/utils/helpers.ts`.
4. Click **Save**.

**Expected:** After save (and optional redirect), the card shows the updated link `src/utils/helpers.ts`. Clicking the link copies the path to the clipboard (or prompts), since it’s not an http(s) URL.

---

### Scenario 4: Pomodoro session count updates

**Steps:**

1. In the Pomodoro widget, set Focus to 1 minute, Break to 1 minute.
2. Click **Start** and wait for the focus timer to reach 0:00.
3. When the alarm plays, note the “Sessions” value.

**Expected:** Phase switches to Break and “Sessions” increments by 1. After the break ends, phase returns to Focus. Session count persists across page reloads (via `localStorage`).

---

### Scenario 5: Search and collapse cards

**Steps:**

1. Add several tasks with different titles and types (e.g. “API docs”, “Fix bug”, “Learn React”).
2. In the board search box, type `bug`.
3. Expand/collapse a card using the ▾ toggle on the card header.

**Expected:** Only cards whose title or type contains “bug” remain visible; others are hidden. Collapsed cards show only the header; expanding shows description, meta, subtasks, and actions. Search and collapse do not affect data.

---

## 6. Optional

### Contribution

- Improve validation for code links (e.g. stricter URL or path rules).
- Add more task types or statuses via `TASK_TYPES` and `STATUSES` in `app.py`.
- Extend the quote list in `static/quote-widget.js` or load quotes from an API.

### Customization

- **Theme:** Edit CSS variables in `static/style.css` (`:root` and `[data-theme="dark"]`) to change colors and spacing.
- **Pomodoro defaults:** Change the default focus/break values in `templates/index.html` (e.g. `value="25"` and `value="5"`).
- **Pet messages:** Edit the `clickMessages` array in `static/pet-widget.js`.

### Future ideas

- Optional backend check that a code link path exists under a project root.
- Export/import tasks (JSON or CSV).
- Filters by due date or type on the board.
- More Pomodoro options (long break, sound choice).
- Optional integration with Git (e.g. branch name from repo).

---

## Data and files

- **Tasks:** Stored in `tasks.json` in the project root. Create it manually if needed; the app will create it when you add the first task.
- **Local state:** Pomodoro phase/time/sessions and UI state (theme, collapsed widgets) are in the browser’s `localStorage` (key prefix: `pomodoro`, `taskManagerTheme`, etc.).

No database or account required. Keep it simple and local.
