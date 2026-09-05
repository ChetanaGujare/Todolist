/**
 * ============================================
 * TASK MANAGER MODULE
 * Complete task management with localStorage
 * ============================================
 */

(function() {
    'use strict';

    // ============================================
    // DOM REFERENCES (with null checks)
    // ============================================
    const $ = (selector) => document.querySelector(selector);
    const $$ = (selector) => document.querySelectorAll(selector);

    const taskListEl = $('#taskList');
    const taskInput = $('#taskInput');
    const addQuickBtn = $('#addQuickBtn');
    const addTaskBtn = $('#addTaskBtn');
    const clearAllBtn = $('#clearAllBtn');
    const reviewBtn = $('#reviewBtn');
    const reviewBadge = $('#reviewBadge');
    const totalCountEl = $('#totalCount');
    const doneCountEl = $('#doneCount');
    const pendingCountEl = $('#pendingCount');
    const progressBar = $('#progressBar');
    const focusTaskCount = $('#focusTaskCount');
    const focusRing = $('#focusRing');
    const focusPercent = $('#focusPercent');
    const currentDateEl = document.querySelector('#currentDate span');
    const themeToggle = $('#themeToggle');

    // ============================================
    // STATE
    // ============================================
    const STORAGE_KEY = 'todolist_tasks';
    const THEME_KEY = 'todolist_theme';
    let tasks = [];
    let currentFilter = 'all';
    const circumference = 2 * Math.PI * 50;

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function getDefaultTasks() {
        return [
            { id: generateId(), title: 'Add localStorage to save and load todo items across sessions', tags: ['JavaScript', 'Storage'], done: false },
            { id: generateId(), title: 'Create HTML structure for the todo list', tags: ['HTML', 'CSS'], done: false },
            { id: generateId(), title: 'Write JS functions to add and delete tasks', tags: ['JavaScript'], done: false },
            { id: generateId(), title: 'Implement localStorage.setItem to store the task array', tags: ['JavaScript', 'Storage'], done: false },
            { id: generateId(), title: 'Load tasks from localStorage on page load', tags: ['JavaScript', 'Storage'], done: false },
            { id: generateId(), title: 'Test adding, removing, and persisting tasks', tags: ['JavaScript', 'Testing'], done: false }
        ];
    }

    // ============================================
    // STORAGE FUNCTIONS
    // ============================================
    function loadTasks() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    tasks = parsed;
                    return;
                }
            }
        } catch (_) {}
        tasks = getDefaultTasks();
        saveTasks();
    }

    function saveTasks() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        } catch (_) {}
    }

    // ============================================
    // THEME FUNCTIONS
    // ============================================
    function loadTheme() {
        if (!themeToggle) return;
        const saved = localStorage.getItem(THEME_KEY);
        if (saved === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        } else {
            document.documentElement.removeAttribute('data-theme');
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        }
    }

    function toggleTheme() {
        if (!themeToggle) return;
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

    // ============================================
    // RENDER FUNCTIONS
    // ============================================
    function render(filter = 'all') {
        // Filter tasks
        let filtered = tasks;
        if (filter === 'done') filtered = tasks.filter(t => t.done);
        else if (filter === 'pending') filtered = tasks.filter(t => !t.done);

        // Sort: undone first
        const sorted = [...filtered].sort((a, b) => {
            if (a.done === b.done) return 0;
            return a.done ? 1 : -1;
        });

        // Render task list
        if (!taskListEl) return;

        if (sorted.length === 0) {
            const msg = filter === 'done' ? 'No completed tasks yet.' :
                        filter === 'pending' ? 'All tasks are completed! 🎉' :
                        'No tasks yet — add one above!';
            taskListEl.innerHTML = `
                <div class="empty-state">
                    <i class="far fa-smile"></i>
                    <p>${msg}</p>
                </div>
            `;
        } else {
            let html = '';
            sorted.forEach(task => {
                const checked = task.done ? 'done' : '';
                const titleClass = task.done ? 'completed' : '';
                const statusText = task.done ? 'Done' : 'In Progress';
                const statusClass = task.done ? 'done' : 'pending';

                html += `
                    <div class="task-card" data-id="${task.id}">
                        <div class="task-check ${checked}" data-id="${task.id}">
                            ${task.done ? '<i class="fas fa-check"></i>' : ''}
                        </div>
                        <div class="task-body">
                            <div class="task-title ${titleClass}">
                                ${escapeHtml(task.title)}
                                <span class="status-badge ${statusClass}">${statusText}</span>
                            </div>
                            <div class="task-tags">
                                ${task.tags.map(tag => `<span class="tag">#${escapeHtml(tag)}</span>`).join('')}
                            </div>
                        </div>
                        <button class="task-delete" data-id="${task.id}" title="Delete">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
            });
            taskListEl.innerHTML = html;
        }

        // Update stats
        updateStats();
    }

    function updateStats() {
        const total = tasks.length;
        const done = tasks.filter(t => t.done).length;
        const pending = total - done;
        const pct = total === 0 ? 0 : Math.round((done / total) * 100);

        if (totalCountEl) totalCountEl.textContent = total;
        if (doneCountEl) doneCountEl.textContent = done;
        if (pendingCountEl) pendingCountEl.textContent = pending;
        if (progressBar) progressBar.style.width = pct + '%';
        if (focusTaskCount) focusTaskCount.textContent = pending;

        // Progress ring
        if (focusRing) {
            const offset = circumference - (pct / 100) * circumference;
            focusRing.style.strokeDashoffset = offset;
        }
        if (focusPercent) focusPercent.textContent = pct + '%';

        // Review badge
        if (reviewBadge) reviewBadge.textContent = `${done}/${total}`;

        saveTasks();
    }

    // ============================================
    // CRUD OPERATIONS
    // ============================================
    function addTask(text) {
        const trimmed = text.trim();
        if (!trimmed) return false;

        tasks.push({
            id: generateId(),
            title: trimmed,
            tags: [],
            done: false
        });

        render(currentFilter);
        return true;
    }

    function deleteTask(id) {
        tasks = tasks.filter(t => t.id !== id);
        render(currentFilter);
    }

    function toggleTask(id) {
        const task = tasks.find(t => t.id === id);
        if (task) {
            task.done = !task.done;
            render(currentFilter);
        }
    }

    function clearAllTasks() {
        if (tasks.length === 0) return;
        if (confirm('Delete all tasks?')) {
            tasks = [];
            render(currentFilter);
        }
    }

    // ============================================
    // EVENT HANDLERS
    // ============================================

    // Task list event delegation (for check and delete)
    if (taskListEl) {
        taskListEl.addEventListener('click', function(e) {
            // Check toggle
            const check = e.target.closest('.task-check');
            if (check) {
                const id = check.dataset.id;
                if (id) toggleTask(id);
                return;
            }

            // Delete button
            const delBtn = e.target.closest('.task-delete');
            if (delBtn) {
                const id = delBtn.dataset.id;
                if (id) deleteTask(id);
                return;
            }

            // Click on task title toggles too
            const titleEl = e.target.closest('.task-title');
            if (titleEl) {
                const card = titleEl.closest('.task-card');
                if (card) {
                    const id = card.dataset.id;
                    if (id) toggleTask(id);
                }
            }
        });
    }

    // Add task handlers
    function handleAdd() {
        if (!taskInput) return;
        const val = taskInput.value;
        if (addTask(val)) {
            taskInput.value = '';
            taskInput.focus();
        } else {
            taskInput.style.borderColor = '#ef4444';
            setTimeout(() => taskInput.style.borderColor = '', 400);
        }
    }

    if (addQuickBtn) addQuickBtn.addEventListener('click', handleAdd);
    if (addTaskBtn) addTaskBtn.addEventListener('click', handleAdd);

    if (taskInput) {
        taskInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
            }
        });
    }

    // Clear all
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', clearAllTasks);
    }

    // Review button
    if (reviewBtn) {
        reviewBtn.addEventListener('click', function() {
            const done = tasks.filter(t => t.done).length;
            const total = tasks.length;
            if (total === 0) {
                alert('📝 No tasks yet. Add some to get started!');
            } else if (done === total) {
                alert('🎉 Amazing! You\'ve completed all tasks!');
            } else {
                alert(`📊 You've completed ${done} out of ${total} tasks. Keep going! 💪`);
            }
        });
    }

    // Tabs
    document.querySelectorAll('.tabs button').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            const id = this.id;
            if (id === 'tabToday') currentFilter = 'all';
            else if (id === 'tabDone') currentFilter = 'done';
            else if (id === 'tabUpcoming') currentFilter = 'pending';
            render(currentFilter);
        });
    });

    // Theme toggle
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // ============================================
    // DATE
    // ============================================
    function setDate() {
        if (!currentDateEl) return;
        const now = new Date();
        const opts = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
        currentDateEl.textContent = now.toLocaleDateString('en-US', opts);
    }

    // ============================================
    // INIT
    // ============================================
    loadTasks();
    loadTheme();
    render('all');
    setDate();

    // Focus input
    if (taskInput) taskInput.focus();

})();