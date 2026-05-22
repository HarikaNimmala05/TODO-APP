class TodoManager {
    constructor() {
        this.todos = this.loadFromLocalStorage();
        this.currentFilter = 'all';
        this.editingId = null;
    }

    // Load todos from localStorage
    loadFromLocalStorage() {
        const stored = localStorage.getItem('todos');
        return stored ? JSON.parse(stored) : [];
    }

    // Save todos to localStorage
    saveToLocalStorage() {
        localStorage.setItem('todos', JSON.stringify(this.todos));
    }

    // Create a new todo
    addTodo(text) {
        if (!text.trim()) return null;

        const todo = {
            id: Date.now(),
            text: text.trim(),
            completed: false,
            createdAt: new Date().toISOString(),
            priority: 'medium'
        };

        this.todos.push(todo);
        this.saveToLocalStorage();
        return todo;
    }

    // Read todos with optional filtering
    getTodos(filter = 'all') {
        switch (filter) {
            case 'active':
                return this.todos.filter(todo => !todo.completed);
            case 'completed':
                return this.todos.filter(todo => todo.completed);
            case 'all':
            default:
                return this.todos;
        }
    }

    // Update a todo
    updateTodo(id, updates) {
        const todo = this.todos.find(t => t.id === id);
        if (!todo) return null;

        Object.assign(todo, updates);
        this.saveToLocalStorage();
        return todo;
    }

    // Delete a todo
    deleteTodo(id) {
        const index = this.todos.findIndex(t => t.id === id);
        if (index === -1) return null;

        const deleted = this.todos[index];
        this.todos.splice(index, 1);
        this.saveToLocalStorage();
        return deleted;
    }

    // Toggle todo completion status
    toggleTodo(id) {
        const todo = this.todos.find(t => t.id === id);
        if (!todo) return null;

        todo.completed = !todo.completed;
        this.saveToLocalStorage();
        return todo;
    }

    // Clear all completed todos
    clearCompleted() {
        const beforeCount = this.todos.length;
        this.todos = this.todos.filter(t => !t.completed);
        this.saveToLocalStorage();
        return beforeCount - this.todos.length;
    }

    // Get statistics
    getStats() {
        const total = this.todos.length;
        const completed = this.todos.filter(t => t.completed).length;
        const active = total - completed;

        return {
            total,
            completed,
            active,
            percentage: total === 0 ? 0 : Math.round((completed / total) * 100)
        };
    }
}

// ==================== DOM Management ====================
class TodoUI {
    constructor(todoManager) {
        this.manager = todoManager;
        this.setupElements();
        this.setupEventListeners();
    }

    // Cache DOM elements
    setupElements() {
        this.input = document.getElementById('todoInput');
        this.addBtn = document.getElementById('addBtn');
        this.todoList = document.getElementById('todoList');
        this.emptyState = document.getElementById('emptyState');
        this.clearBtn = document.getElementById('clearBtn');
        this.filterBtns = document.querySelectorAll('.filter-btn');
        this.totalTasksEl = document.getElementById('totalTasks');
        this.completedTasksEl = document.getElementById('completedTasks');
        this.progressPercentEl = document.getElementById('progressPercent');
    }

    // Setup all event listeners using event delegation
    setupEventListeners() {
        // Add todo with Enter key or button click
        this.input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') this.handleAddTodo();
});
        this.addBtn.addEventListener('click', () => this.handleAddTodo());

        // Filter buttons
        this.filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleFilterChange(e));
        });

        // Clear completed button
        this.clearBtn.addEventListener('click', () => this.handleClearCompleted());

        // Event delegation for todo actions (edit, delete, toggle)
        this.todoList.addEventListener('click', (e) => this.handleTodoAction(e));
        this.todoList.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.classList.contains('edit-input')) {
        this.handleSaveEdit(e);
    }

    if (e.key === 'Escape' && e.target.classList.contains('edit-input')) {
        this.handleCancelEdit(e);
    }
});
    }

    // Handle adding a new todo
    handleAddTodo() {
        const text = this.input.value;
        const todo = this.manager.addTodo(text);

        if (todo) {
            this.input.value = '';
            this.input.focus();
            this.render();
        }
    }

    // Handle filter changes
    handleFilterChange(e) {
        const filter = e.target.dataset.filter;
        this.manager.currentFilter = filter;

        // Update active button
        this.filterBtns.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');

        this.render();
    }

    // Handle todo actions (delegated event listener)
    handleTodoAction(e) {
        const todoItem = e.target.closest('.todo-item');
        if (!todoItem) return;

        const todoId = parseInt(todoItem.dataset.id);

        if (e.target.classList.contains('todo-checkbox')) {
            this.manager.toggleTodo(todoId);
            this.render();
        } else if (e.target.classList.contains('edit-btn')) {
            this.enableEditMode(todoItem, todoId);
        } else if (e.target.classList.contains('delete-btn')) {
            this.handleDeleteTodo(todoId);
        } else if (e.target.classList.contains('save-btn')) {
            this.handleSaveEdit(e);
        } else if (e.target.classList.contains('cancel-btn')) {
            this.handleCancelEdit(e);
        }
    }

    // Enable edit mode for a todo
    enableEditMode(todoItem, todoId) {
        if (this.manager.editingId !== null) {
            // Cancel previous edit
            document.querySelector(`[data-id="${this.manager.editingId}"]`).classList.remove('edit-mode');
        }

        const todo = this.manager.todos.find(t => t.id === todoId);
        if (!todo) return;

        this.manager.editingId = todoId;
        todoItem.classList.add('edit-mode');

        // Replace todo content with edit input
        const textElement = todoItem.querySelector('.todo-text');
        const editHTML = `
            <input type="text" class="edit-input" value="${this.escapeHtml(todo.text)}" autofocus>
            <button class="action-btn save-btn">Save</button>
            <button class="action-btn cancel-btn">Cancel</button>
        `;

        // Remove old elements
        const checkbox = todoItem.querySelector('.todo-checkbox');
        const actions = todoItem.querySelector('.todo-actions');
        
        todoItem.innerHTML = '';
        todoItem.appendChild(checkbox);
        
        const editContainer = document.createElement('div');
        editContainer.style.flex = '1';
        editContainer.style.display = 'flex';
        editContainer.style.gap = '8px';
        editContainer.innerHTML = editHTML;
        
        todoItem.appendChild(editContainer);
        todoItem.appendChild(actions);

        // Focus the input
        todoItem.querySelector('.edit-input').focus();
    }

    // Handle saving edited todo
    handleSaveEdit(e) {
        const todoItem = e.target.closest('.todo-item');
        const todoId = parseInt(todoItem.dataset.id);
        const editInput = todoItem.querySelector('.edit-input');
        const newText = editInput.value.trim();

        if (newText) {
            this.manager.updateTodo(todoId, { text: newText });
            this.manager.editingId = null;
            this.render();
        }
    }

    // Handle canceling edit
    handleCancelEdit(e) {
        const todoItem = e.target.closest('.todo-item');
        const todoId = parseInt(todoItem.dataset.id);
        this.manager.editingId = null;
        todoItem.classList.remove('edit-mode');
        this.render();
    }

    // Handle deleting a todo
    handleDeleteTodo(todoId) {
        if (confirm('Are you sure you want to delete this task?')) {
            this.manager.deleteTodo(todoId);
            this.render();
        }
    }

    // Handle clearing completed todos
    handleClearCompleted() {
        const completedCount = this.manager.todos.filter(t => t.completed).length;
        
        if (completedCount === 0) {
            alert('No completed tasks to clear!');
            return;
        }

        if (confirm(`Clear ${completedCount} completed task(s)?`)) {
            this.manager.clearCompleted();
            this.render();
        }
    }

    // Render all todos
    render() {
        this.renderTodos();
        this.updateStats();
        this.updateFilterCounts();
        this.updateEmptyState();
    }

    // Render todo items
    renderTodos() {
        const todos = this.manager.getTodos(this.manager.currentFilter);
        this.todoList.innerHTML = '';

        todos.forEach(todo => {
            const li = document.createElement('li');
            li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
            li.dataset.id = todo.id;

            const priorityClass = `priority-${todo.priority || 'medium'}`;
            const checkedAttr = todo.completed ? 'checked' : '';

            li.innerHTML = `
                <input type="checkbox" class="todo-checkbox" ${checkedAttr}>
                <span class="todo-text">${this.escapeHtml(todo.text)}</span>
                <span class="priority-badge ${priorityClass}">${todo.priority || 'medium'}</span>
                <div class="todo-actions">
                    <button class="action-btn edit-btn">Edit</button>
                    <button class="action-btn delete-btn">Delete</button>
                </div>
            `;

            this.todoList.appendChild(li);
        });
    }

    // Update statistics
    updateStats() {
        const stats = this.manager.getStats();
        this.totalTasksEl.textContent = stats.total;
        this.completedTasksEl.textContent = stats.completed;
        this.progressPercentEl.textContent = `${stats.percentage}%`;
    }

    // Update filter button counts
    updateFilterCounts() {
        const stats = this.manager.getStats();
        
        this.filterBtns.forEach(btn => {
            const filter = btn.dataset.filter;
            const countSpan = btn.querySelector('.filter-count');
            
            let count;
            switch (filter) {
                case 'active':
                    count = stats.active;
                    break;
                case 'completed':
                    count = stats.completed;
                    break;
                case 'all':
                default:
                    count = stats.total;
            }
            
            countSpan.textContent = `(${count})`;
        });
    }

    // Update empty state visibility
    updateEmptyState() {
        const todos = this.manager.getTodos(this.manager.currentFilter);
        if (todos.length === 0) {
            this.emptyState.classList.add('show');
            this.todoList.style.display = 'none';
        } else {
            this.emptyState.classList.remove('show');
            this.todoList.style.display = 'flex';
        }

        // Disable clear button if no completed tasks
        const hasCompleted = this.manager.todos.some(t => t.completed);
        this.clearBtn.disabled = !hasCompleted;
    }

    // Escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// ==================== Initialize Application ====================
document.addEventListener('DOMContentLoaded', () => {
    const manager = new TodoManager();
    const ui = new TodoUI(manager);
    
    // Initial render
    ui.render();

    // Log welcome message
    console.log('📝 To-Do List App initialized!');
    console.log(`📊 Loaded ${manager.todos.length} tasks from localStorage`);
});
