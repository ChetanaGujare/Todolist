(function() {
    'use strict';

    // ---------- DOM refs ----------
    const taskListEl = document.getElementById('taskList');
    const taskInput = document.getElementById('taskInput');
    const quickPriority = document.getElementById('quickPriority');
    const addQuickBtn = document.getElementById('addQuickBtn');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const clearAllBtn = document.getElementById('clearAllBtn');
    const reviewBtn = document.getElementById('reviewBtn');
    const reviewBadge = document.getElementById('reviewBadge');
    const totalCountEl = document.getElementById('totalCount');
    const doneCountEl = document.getElementById('doneCount');
    const pendingCountEl = document.getElementById('pendingCount');
    const progressBar = document.getElementById('progressBar');
    const focusTaskCount = document.getElementById('focusTaskCount');
    const focusTaskTitle = document.getElementById('focusTaskTitle');
    const focusDueMeta = document.getElementById('focusDueMeta');
    const focusDueText = document.getElementById('focusDueText');
    const focusRing = document.getElementById('focusRing');
    const focusPercent = document.getElementById('focusPercent');
    const currentDateEl = document.querySelector('#currentDate span');
    const themeToggle = document.getElementById('themeToggle');
    const searchInput = document.getElementById('searchInput');
    const toastStack = document.getElementById('toastStack');

    // Modal refs
    const taskModalOverlay = document.getElementById('taskModalOverlay');
    const taskForm = document.getElementById('taskForm');
    const modalTaskTitle = document.getElementById('modalTaskTitle');
    const modalPriority = document.getElementById('modalPriority');
    const modalDueDate = document.getElementById('modalDueDate');
    const modalTags = document.getElementById('modalTags');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const modalCancelBtn = document.getElementById('modalCancelBtn');

    const confirmOverlay = document.getElementById('confirmOverlay');
    const confirmCancelBtn = document.getElementById('confirmCancelBtn');
    const confirmOkBtn = document.getElementById('confirmOkBtn');

    const STORAGE_KEY = 'todolist_tasks';
    const THEME_KEY = 'todolist_theme';
    let tasks = [];
    let currentFilter = 'all';
    let searchQuery = '';
    const priorityWeight = { high: 0, medium: 1, low: 2 };

    // ---------- Helpers ----------
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    const circumference = 2 * Math.PI * 50;

    function todayISO() {
        const d = new Date();
        return d.toISOString().slice(0, 10);
    }

    function formatDue(iso) {
        if (!iso) return '';
        const due = new Date(iso + 'T00:00:00');
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const diffDays = Math.round((due - now) / 86400000);
        if (diffDays === 0) return 'Due today';
        if (diffDays === 1) return 'Due tomorrow';
        if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)}d`;
        return `Due ${due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }

    // ---------- Toasts ----------
    function showToast(message, type = 'default', icon = 'fa-circle-check') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<i class="fas ${icon}"></i><span>${escapeHtml(message)}</span>`;
        toastStack.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('leaving');
            toast.addEventListener('animationend', () => toast.remove(), { once: true });
        }, 2600);
    }

    // ---------- Default Tasks ----------
    function getDefaultTasks() {
        return [
            { id: generateId(), title: 'Add localStorage to save and load todo items across sessions', tags: ['JavaScript', 'Storage'], priority: 'high', dueDate: '', done: false },
            { id: generateId(), title: 'Create HTML structure for the todo list', tags: ['HTML', 'CSS'], priority: 'medium', dueDate: '', done: false },
            { id: generateId(), title: 'Write JS functions to add and delete tasks', tags: ['JavaScript'], priority: 'high', dueDate: '', done: false },
            { id: generateId(), title: 'Implement localStorage.setItem to store the task array', tags: ['JavaScript', 'Storage'], priority: 'medium', dueDate: '', done: false },
            { id: generateId(), title: 'Load tasks from localStorage on page load', tags: ['JavaScript', 'Storage'], priority: 'medium', dueDate: '', done: false },
            { id: generateId(), title: 'Test adding, removing, and persisting tasks', tags: ['JavaScript', 'Testing'], priority: 'low', dueDate: '', done: false }
        ];
    }

    // ---------- Save / Load ----------
    function saveTasks() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); } catch (_) {}
    }

    function loadTasks() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    // Backfill fields for tasks saved by an older version of the app
                    tasks = parsed.map(t => ({
                        priority: 'medium',
                        dueDate: '',
                        tags: [],
                        ...t
                    }));
                    return;
                }
            }
        } catch (_) {}
        tasks = getDefaultTasks();
        saveTasks();
    }

    // ---------- Theme ----------
    function loadTheme() {
        // Defaults to dark on first visit so the app doesn't look washed out;
        // once the user picks a mode, that choice is remembered.
        const saved = localStorage.getItem(THEME_KEY) || 'dark';
        if (saved === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        } else {
            document.documentElement.removeAttribute('data-theme');
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        }
    }

    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        if (current === 'dark') {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem(THEME_KEY, 'light');
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem(THEME_KEY, 'dark');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }
    }

    // ---------- Render ----------
    function getFilteredTasks() {
        let filtered = tasks;
        if (currentFilter === 'done') filtered = filtered.filter(t => t.done);
        else if (currentFilter === 'pending') filtered = filtered.filter(t => !t.done);

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(t =>
                t.title.toLowerCase().includes(q) ||
                (t.tags || []).some(tag => tag.toLowerCase().includes(q))
            );
        }
        return filtered;
    }

    function renderTaskCard(task) {
        const checked = task.done ? 'done' : '';
        const titleClass = task.done ? 'completed' : '';
        const statusText = task.done ? 'Done' : 'In Progress';
        const statusClass = task.done ? 'done' : 'pending';
        const priority = task.priority || 'medium';
        const dueLabel = task.dueDate ? formatDue(task.dueDate) : '';
        const isOverdue = task.dueDate && !task.done && new Date(task.dueDate + 'T00:00:00') < new Date(new Date().toDateString());

        return `
            <div class="task-card priority-${priority}" data-id="${task.id}">
                <div class="task-check ${checked}" data-id="${task.id}" role="checkbox" aria-checked="${task.done}" tabindex="0" title="Mark ${task.done ? 'pending' : 'done'}">
                    ${task.done ? '<i class="fas fa-check"></i>' : ''}
                </div>
                <div class="task-body">
                    <div class="task-title ${titleClass}" data-id="${task.id}" title="Click to rename">
                        <span class="task-title-text">${escapeHtml(task.title)}</span>
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </div>
                    <div class="task-meta-row">
                        <span class="priority-chip ${priority}">${priority.charAt(0).toUpperCase() + priority.slice(1)}</span>
                        ${dueLabel ? `<span class="due-chip ${isOverdue ? 'overdue' : ''}"><i class="far fa-clock"></i> ${escapeHtml(dueLabel)}</span>` : ''}
                        <div class="task-tags">
                            ${(task.tags || []).map(tag => `<span class="tag">#${escapeHtml(tag)}</span>`).join('')}
                        </div>
                    </div>
                </div>
                <div class="task-actions">
                    <button class="task-edit" data-id="${task.id}" title="Rename"><i class="fas fa-pen"></i></button>
                    <button class="task-delete" data-id="${task.id}" title="Delete"><i class="fas fa-times"></i></button>
                </div>
            </div>
        `;
    }

    function render() {
        const filtered = getFilteredTasks();

        const sorted = [...filtered].sort((a, b) => {
            if (a.done !== b.done) return a.done ? 1 : -1;
            return (priorityWeight[a.priority] ?? 1) - (priorityWeight[b.priority] ?? 1);
        });

        if (sorted.length === 0) {
            let msg = 'No tasks yet — add one above!';
            if (searchQuery) msg = `No tasks match "${searchQuery}".`;
            else if (currentFilter === 'done') msg = 'No completed tasks yet.';
            else if (currentFilter === 'pending') msg = 'All tasks are completed! 🎉';
            taskListEl.innerHTML = `
                <div class="empty-state">
                    <i class="far fa-smile"></i>
                    <p>${escapeHtml(msg)}</p>
                </div>
            `;
        } else {
            taskListEl.innerHTML = sorted.map(renderTaskCard).join('');
        }

        // Update stats
        const total = tasks.length;
        const done = tasks.filter(t => t.done).length;
        const pending = total - done;
        const pct = total === 0 ? 0 : Math.round((done / total) * 100);

        bumpStat(totalCountEl, total);
        bumpStat(doneCountEl, done);
        bumpStat(pendingCountEl, pending);
        progressBar.style.width = pct + '%';

        // Focus banner: highlight the next pending high-priority task, if any
        focusTaskCount.textContent = pending;
        const nextTask = tasks.filter(t => !t.done).sort((a, b) =>
            (priorityWeight[a.priority] ?? 1) - (priorityWeight[b.priority] ?? 1)
        )[0];
        if (nextTask) {
            focusTaskTitle.textContent = nextTask.title;
            if (nextTask.dueDate) {
                focusDueMeta.hidden = false;
                focusDueText.textContent = formatDue(nextTask.dueDate);
            } else {
                focusDueMeta.hidden = true;
            }
        } else {
            focusTaskTitle.textContent = 'All caught up!';
            focusDueMeta.hidden = true;
        }

        // Progress ring
        const offset = circumference - (pct / 100) * circumference;
        focusRing.style.strokeDashoffset = offset;
        focusPercent.textContent = pct + '%';

        // Review badge
        reviewBadge.textContent = `${done}/${total}`;

        saveTasks();
    }

    function bumpStat(el, value) {
        if (el.textContent !== String(value)) {
            el.textContent = value;
            el.classList.remove('bump');
            void el.offsetWidth; // restart animation
            el.classList.add('bump');
        }
    }

    // ---------- CRUD ----------
    function addTask({ title, priority = 'medium', dueDate = '', tags = [] }) {
        const trimmed = title.trim();
        if (!trimmed) return false;
        tasks.push({
            id: generateId(),
            title: trimmed,
            tags,
            priority,
            dueDate,
            done: false
        });
        render();
        return true;
    }

    function removeTaskFromState(id) {
        tasks = tasks.filter(t => t.id !== id);
        render();
    }

    function deleteTask(id) {
        const card = taskListEl.querySelector(`.task-card[data-id="${id}"]`);
        if (card) {
            card.classList.add('removing');
            card.addEventListener('animationend', () => removeTaskFromState(id), { once: true });
        } else {
            removeTaskFromState(id);
        }
    }

    function toggleTask(id) {
        const task = tasks.find(t => t.id === id);
        if (task) {
            task.done = !task.done;
            render();
            if (task.done) showToast('Task completed', 'success', 'fa-check-circle');
        }
    }

    function updateTaskTitle(id, newTitle) {
        const trimmed = newTitle.trim();
        const task = tasks.find(t => t.id === id);
        if (task && trimmed && trimmed !== task.title) {
            task.title = trimmed;
            render();
            showToast('Task updated', 'success', 'fa-pen');
        } else {
            render();
        }
    }

    function clearAllTasks() {
        tasks = [];
        render();
        showToast('All tasks cleared', 'danger', 'fa-trash-alt');
    }

    // ---------- Inline edit ----------
    function beginEdit(id) {
        const titleEl = taskListEl.querySelector(`.task-title[data-id="${id}"]`);
        const task = tasks.find(t => t.id === id);
        if (!titleEl || !task || titleEl.querySelector('.task-title-edit')) return;

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'task-title-edit';
        input.value = task.title;
        titleEl.innerHTML = '';
        titleEl.appendChild(input);
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);

        const commit = () => updateTaskTitle(id, input.value);
        input.addEventListener('blur', commit, { once: true });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
            if (e.key === 'Escape') { e.preventDefault(); input.value = task.title; input.blur(); }
        });
    }

    // ---------- Event Delegation ----------
    taskListEl.addEventListener('click', (e) => {
        const check = e.target.closest('.task-check');
        if (check) { toggleTask(check.dataset.id); return; }

        const delBtn = e.target.closest('.task-delete');
        if (delBtn) { deleteTask(delBtn.dataset.id); return; }

        const editBtn = e.target.closest('.task-edit');
        if (editBtn) { beginEdit(editBtn.dataset.id); return; }

        const titleEl = e.target.closest('.task-title');
        if (titleEl && !e.target.closest('.status-badge')) {
            beginEdit(titleEl.dataset.id);
        }
    });

    taskListEl.addEventListener('keydown', (e) => {
        const check = e.target.closest('.task-check');
        if (check && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            toggleTask(check.dataset.id);
        }
    });

    // ---------- Quick add ----------
    function handleQuickAdd() {
        const ok = addTask({ title: taskInput.value, priority: quickPriority.value });
        if (ok) {
            taskInput.value = '';
            taskInput.focus();
            showToast('Task added', 'success', 'fa-plus');
        } else {
            const wrapper = taskInput.closest('.quick-add');
            wrapper.classList.add('shake');
            setTimeout(() => wrapper.classList.remove('shake'), 400);
        }
    }

    addQuickBtn.addEventListener('click', handleQuickAdd);
    taskInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); handleQuickAdd(); }
    });

    // ---------- New Task modal ----------
    function openTaskModal() {
        taskForm.reset();
        modalPriority.value = 'medium';
        taskModalOverlay.hidden = false;
        setTimeout(() => modalTaskTitle.focus(), 10);
    }

    function closeTaskModal() {
        taskModalOverlay.hidden = true;
    }

    addTaskBtn.addEventListener('click', openTaskModal);
    modalCloseBtn.addEventListener('click', closeTaskModal);
    modalCancelBtn.addEventListener('click', closeTaskModal);
    taskModalOverlay.addEventListener('click', (e) => {
        if (e.target === taskModalOverlay) closeTaskModal();
    });

    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const tags = modalTags.value.split(',').map(t => t.trim()).filter(Boolean);
        const ok = addTask({
            title: modalTaskTitle.value,
            priority: modalPriority.value,
            dueDate: modalDueDate.value,
            tags
        });
        if (ok) {
            closeTaskModal();
            showToast('Task added', 'success', 'fa-plus');
        }
    });

    // ---------- Clear all (confirm modal) ----------
    function openConfirm() {
        if (tasks.length === 0) return;
        confirmOverlay.hidden = false;
    }
    function closeConfirm() {
        confirmOverlay.hidden = true;
    }
    clearAllBtn.addEventListener('click', openConfirm);
    confirmCancelBtn.addEventListener('click', closeConfirm);
    confirmOverlay.addEventListener('click', (e) => {
        if (e.target === confirmOverlay) closeConfirm();
    });
    confirmOkBtn.addEventListener('click', () => {
        closeConfirm();
        clearAllTasks();
    });

    // ---------- Global escape key ----------
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (!taskModalOverlay.hidden) closeTaskModal();
        if (!confirmOverlay.hidden) closeConfirm();
    });

    // ---------- Search ----------
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim();
        render();
    });

    // ---------- Review ----------
    reviewBtn.addEventListener('click', () => {
        const done = tasks.filter(t => t.done).length;
        const total = tasks.length;
        if (total === 0) showToast('No tasks yet — add some to get started', 'default', 'fa-clipboard-list');
        else if (done === total) showToast('Amazing! You\u2019ve completed all tasks', 'success', 'fa-trophy');
        else showToast(`${done} of ${total} tasks done — keep going!`, 'default', 'fa-thumbs-up');
    });

    // ---------- Tabs ----------
    document.querySelectorAll('.tabs button').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tabs button').forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            this.classList.add('active');
            this.setAttribute('aria-selected', 'true');

            const id = this.id;
            if (id === 'tabToday') currentFilter = 'all';
            else if (id === 'tabDone') currentFilter = 'done';
            else if (id === 'tabUpcoming') currentFilter = 'pending';
            render();
        });
    });

    // ---------- Theme ----------
    themeToggle.addEventListener('click', toggleTheme);

    // ---------- Date ----------
    function setDate() {
        const now = new Date();
        const opts = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
        currentDateEl.textContent = now.toLocaleDateString('en-US', opts);
    }

    // ---------- Init ----------
    loadTasks();
    loadTheme();
    render();
    setDate();
    taskInput.focus();

})();