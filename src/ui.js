import { Calculator } from './calculator.js';

// Debounce utility function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export const ui = {
  calculator: new Calculator(),
  lastCalculatedText: '',
  lastResults: [],
  
  elements: {},

  init() {
    // Initialize DOM elements
    this.elements = {
      spotlightOverlay: document.getElementById('spotlight-overlay'),
      spotlightInput: document.getElementById('spotlight-input'),
      spotlightList: document.getElementById('spotlight-list'),
      tabBar: document.getElementById('tab-bar'),
      editor: document.getElementById('note-editor'),
      resultsDisplay: document.getElementById('results-display'),
      timestamp: document.getElementById('timestamp-display'),
      menuBtn: document.getElementById('menu-btn'),
      deleteBtn: document.getElementById('delete-btn'),
      highlighter: document.getElementById('highlighter'),
      // Delete Modal Elements
      deleteModalOverlay: document.getElementById('delete-modal-overlay'),
      deleteModal: document.getElementById('delete-modal'),
      confirmDeleteBtn: document.getElementById('confirm-delete-btn'),
      cancelDeleteBtn: document.getElementById('cancel-delete-btn'),
      themeBtn: document.getElementById('theme-btn'),
    };

    this.initTheme();

    // Initialize currencies in background
    this.calculator.waitForReady().then(() => {
      console.log('Calculator ready with live currency rates');
    }).catch(err => {
      console.warn('Calculator initialized with fallback rates:', err);
    });

    // Sync scrolling
    this.elements.editor.addEventListener('scroll', () => {
        this.elements.resultsDisplay.scrollTop = this.elements.editor.scrollTop;
        this.elements.highlighter.scrollTop = this.elements.editor.scrollTop;
    });

    // Input handling for highlighter
    this.elements.editor.addEventListener('input', () => {
        this.updateHighlighter(this.elements.editor.value);
    });
    // Delete Modal Events
    // Note: deleteBtn click is handled in app.js to access activeNoteId
    
    this.elements.cancelDeleteBtn.addEventListener("click", () => {
        this.hideDeleteModal();
    });

    console.log('UI Initialized');
  },

  updateHighlighter(text) {
      // Escape HTML first
      let html = this._escapeHtml(text);

      // Yellow Comments Highlighting (# ...)
      // We use a regex to find lines starting with # and wrap them in a span
      // Use amber-600 for light mode (readable) and yellow-400 for dark mode
      html = html.replace(/^#(.*$)/gm, '<span class="text-amber-600 dark:text-yellow-400">#$1</span>');
      
      // Currency Highlighting (Purple)
      // Highlight common currency codes (case insensitive)
      const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'SEK', 'NZD', 'KRW', 'SGD', 'NOK', 'MXN', 'INR', 'RUB', 'ZAR', 'TRY', 'BRL', 'TWD', 'DKK', 'PLN', 'THB', 'IDR', 'HUF', 'CZK', 'ILS', 'CLP', 'PHP', 'AED', 'COP', 'SAR', 'MYR', 'RON'];
      const currencyRegex = new RegExp(`\\b(${currencies.join('|')})\\b`, 'gi');
      html = html.replace(currencyRegex, '<span class="text-purple-400">$1</span>');
      
      // Handle trailing newline
      if (text.endsWith('\n')) {
          html += '<br>';
      }

      this.elements.highlighter.innerHTML = html;
  },

  showDeleteModal() {
      const { deleteModal, deleteModalOverlay } = this.elements;
      deleteModal.classList.remove('hidden');
      deleteModalOverlay.classList.remove('hidden');
      
      // Trigger reflow
      void deleteModal.offsetWidth;
      
      deleteModal.classList.remove('opacity-0', 'scale-95');
      deleteModalOverlay.classList.remove('opacity-0');
  },

  hideDeleteModal() {
      const { deleteModal, deleteModalOverlay } = this.elements;
      deleteModal.classList.add('opacity-0', 'scale-95');
      deleteModalOverlay.classList.add('opacity-0');
      
      setTimeout(() => {
          deleteModal.classList.add('hidden');
          deleteModalOverlay.classList.add('hidden');
      }, 300);
  },

  renderTabs(tabs, activeTabId) {
    this.elements.tabBar.innerHTML = '';
    
    tabs.forEach(tab => {
        const el = document.createElement('div');
        const isActive = tab.id === activeTabId;
        
        el.className = `flex items-center gap-2 px-4 py-3 text-xs font-mono border-r border-zinc-200 dark:border-zinc-900 cursor-pointer transition-colors min-w-[120px] max-w-[200px] group ${
            isActive 
                ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white' 
                : 'bg-zinc-50 dark:bg-black text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-950 hover:text-zinc-600 dark:hover:text-zinc-300'
        }`;
        
        const title = tab.content.split('\n')[0] || 'Untitled';
        
        el.innerHTML = `
            <span class="truncate flex-1">${this._escapeHtml(title)}</span>
            <button class="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity p-1 rounded" data-action="close-tab" data-id="${tab.id}">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        `;
        
        el.dataset.id = tab.id;
        this.elements.tabBar.appendChild(el);
    });

    // Add New Tab Button
    const newTabBtn = document.createElement('button');
    newTabBtn.className = 'flex items-center justify-center px-4 py-3 text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors border-r border-zinc-200 dark:border-zinc-900';
    newTabBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
    newTabBtn.dataset.action = 'new-tab';
    newTabBtn.title = 'New Tab';
    this.elements.tabBar.appendChild(newTabBtn);
  },

  toggleSpotlight(show) {
    if (show) {
        this.elements.spotlightOverlay.classList.remove('hidden');
        this.elements.spotlightInput.focus();
    } else {
        this.elements.spotlightOverlay.classList.add('hidden');
        this.elements.editor.focus();
    }
  },

  renderSpotlightItems(notes, activeIndex = 0) {
    this.elements.spotlightList.innerHTML = '';
    
    if (notes.length === 0) {
        this.elements.spotlightList.innerHTML = '<div class="p-4 text-center text-zinc-600 text-sm font-mono">No notes found</div>';
        return;
    }

    notes.forEach((note, index) => {
      const el = document.createElement('div');
      el.className = `p-3 cursor-pointer flex justify-between items-center group transition-colors ${
        index === activeIndex 
          ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white' 
          : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 hover:text-zinc-700 dark:hover:text-zinc-200'
      }`;
      
      const title = note.content.split('\n')[0] || 'Untitled Note';
      const date = new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

      el.innerHTML = `
        <span class="font-mono text-sm truncate pr-4">${this._escapeHtml(title)}</span>
        <span class="text-xs font-mono opacity-50 flex-shrink-0">${date}</span>
      `;
      
      el.dataset.id = note.id;
      el.dataset.index = index;
      this.elements.spotlightList.appendChild(el);
    });
  },

  updateEditor(note) {
    if (!note) {
      this.elements.editor.value = '';
      this.elements.editor.placeholder = 'Create a new note...';
      this.elements.editor.disabled = true;
      this.elements.timestamp.textContent = '';
      this.elements.deleteBtn.disabled = true;
      this.elements.deleteBtn.classList.add('opacity-0');
      this.toggleBottomBarInfo(false);
      this.renderResults([]);
      this.updateHighlighter('');
      return;
    }

    this.elements.editor.disabled = false;
    this.elements.editor.placeholder = 'Start typing...';
    this.elements.editor.value = note.content;
    this.elements.deleteBtn.disabled = false;
    this.elements.deleteBtn.classList.remove('opacity-0');
    
    this.calculateAndRender(note.content);
    this.updateHighlighter(note.content);

    // Hide timestamp and delete if note is empty (first time UX)
    this.toggleBottomBarInfo(!!(note.content && note.content.trim() !== ''));
    
    if (note.content && note.content.trim() !== '') {
      this.updateTimestamp(note.updatedAt);
    }
  },

  toggleBottomBarInfo(show) {
      const bottomBar = document.getElementById('bottom-bar');
      const conditionalSeparators = document.querySelectorAll('#bottom-bar .separator-conditional');
      
      if (show) {
          this.elements.timestamp.style.display = 'block';
          this.elements.deleteBtn.style.display = 'block';
          conditionalSeparators.forEach(s => s.style.display = 'block');
      } else {
          this.elements.timestamp.style.display = 'none';
          this.elements.deleteBtn.style.display = 'none';
          conditionalSeparators.forEach(s => s.style.display = 'none');
      }
  },

  calculateAndRender(text) {
      // Skip calculation if text hasn't changed
      if (text === this.lastCalculatedText) {
          return this.lastResults;
      }
      
      const results = this.calculator.evaluate(text);
      this.lastCalculatedText = text;
      this.lastResults = results;
      this.renderResults(results);
      return results;
  },

  renderResults(results) {
      this.elements.resultsDisplay.innerHTML = results.map(r => `<div>${r || '&nbsp;'}</div>`).join('');
  },

  updateTimestamp(timestamp) {
    if (!timestamp) return;
    const date = new Date(timestamp);
    this.elements.timestamp.textContent = `${date.toLocaleString()}`;
  },

  _escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
 },


 initTheme() {
    const savedTheme = localStorage.getItem('numla-theme');
    // Default to dark if not set, or if set to dark
    const isDark = savedTheme === 'light' ? false : true;
    this.setTheme(isDark);
 },

 setTheme(isDark) {
    console.log('Setting theme:', isDark ? 'dark' : 'light');
    if (isDark) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('numla-theme', isDark ? 'dark' : 'light');
    this.updateThemeIcon(isDark);
 },

 toggleTheme() {
    const isDark = document.documentElement.classList.contains('dark');
    this.setTheme(!isDark);
 },

 updateThemeIcon(isDark) {
    // If Dark Mode -> Show Sun (to switch to light)
    // If Light Mode -> Show Moon (to switch to dark)
    const icon = isDark 
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
    
    if (this.elements.themeBtn) {
        this.elements.themeBtn.innerHTML = icon;
    }
 }
};
