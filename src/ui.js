import { Calculator } from './calculator.js';

// Debounce utility function
export function debounce(func, wait) {
  let timeout;
  const debounced = function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };
  return debounced;
}

export const ui = {
  calculator: new Calculator(),
  lastCalculatedText: '',
  lastResults: [],
  sidebarNotes: [], // Store all notes for sidebar filtering
  sidebarActiveNoteId: null, // Store active note ID for sidebar
  tabManagerNotes: [], // Store all notes for tab manager filtering
  tabManagerActiveNoteId: null, // Store active note ID for tab manager
  
  elements: {},

  init() {
    // Initialize DOM elements
    this.elements = {
      spotlightOverlay: document.getElementById('spotlight-overlay'),
      spotlightInput: document.getElementById('spotlight-input'),
      spotlightList: document.getElementById('spotlight-list'),
      editor: document.getElementById('note-editor'),
      resultsDisplay: document.getElementById('results-display'),
      timestamp: document.getElementById('timestamp-display'),
      deleteBtn: document.getElementById('delete-btn'),
      exportBtn: document.getElementById('export-btn'),
      highlighter: document.getElementById('highlighter'),
      // Delete Modal Elements
      deleteModalOverlay: document.getElementById('delete-modal-overlay'),
      deleteModal: document.getElementById('delete-modal'),
      confirmDeleteBtn: document.getElementById('confirm-delete-btn'),
      cancelDeleteBtn: document.getElementById('cancel-delete-btn'),
      // Desktop controls (in tab bar)
      themeToggleBtn: document.getElementById('theme-toggle-btn'),
      // Mobile Bottom Bar Elements
      noteTitleDisplay: document.getElementById('note-title-display'),
      timestampDisplayMobile: document.getElementById('timestamp-display-mobile'),
      exportBtnMobile: document.getElementById('export-btn-mobile'),
      deleteBtnMobile: document.getElementById('delete-btn-mobile'),
      themeToggleBtnMobile: document.getElementById('theme-toggle-btn-mobile'),
      // Tab Bar
      tabBar: document.getElementById('tab-bar'),
      // Sidebar Elements
      menuBtn: document.getElementById('menu-btn'),
      sidebar: document.getElementById('sidebar'),
      sidebarOverlay: document.getElementById('sidebar-overlay'),
      sidebarCloseBtn: document.getElementById('sidebar-close-btn'),
      sidebarNewBtn: document.getElementById('sidebar-new-btn'),
      sidebarSearchInput: document.getElementById('sidebar-search-input'),
      sidebarList: document.getElementById('sidebar-list'),
      // Tab Manager Sidebar Elements
      tabManagerBtn: document.getElementById('tab-manager-btn'),
      tabManagerSidebar: document.getElementById('tab-manager-sidebar'),
      tabManagerOverlay: document.getElementById('tab-manager-overlay'),
      tabManagerCloseBtn: document.getElementById('tab-manager-close-btn'),
      tabManagerSearchInput: document.getElementById('tab-manager-search-input'),
      tabManagerList: document.getElementById('tab-manager-list'),
      deleteAllNotesBtn: document.getElementById('delete-all-notes-btn'),
      // Delete All Notes Modal Elements
      closeAllModalOverlay: document.getElementById('close-all-modal-overlay'),
      closeAllModal: document.getElementById('close-all-modal'),
      confirmCloseAllBtn: document.getElementById('confirm-close-all-btn'),
      cancelCloseAllBtn: document.getElementById('cancel-close-all-btn'),
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

    // Theme Toggle Events (Desktop and Mobile)
    this.elements.themeToggleBtn.addEventListener('click', () => this.toggleTheme());
    if (this.elements.themeToggleBtnMobile) {
        this.elements.themeToggleBtnMobile.addEventListener('click', () => this.toggleTheme());
    }

    // Sidebar Events
    if (this.elements.menuBtn) {
        this.elements.menuBtn.addEventListener('click', () => this.toggleSidebar(true));
    }
    if (this.elements.sidebarCloseBtn) {
        this.elements.sidebarCloseBtn.addEventListener('click', () => this.toggleSidebar(false));
    }
    if (this.elements.sidebarOverlay) {
        this.elements.sidebarOverlay.addEventListener('click', () => this.toggleSidebar(false));
    }
    if (this.elements.sidebarSearchInput) {
        this.elements.sidebarSearchInput.addEventListener('input', (e) => this.filterSidebarNotes(e.target.value));
    }

    // Tab Manager Sidebar Events
    if (this.elements.tabManagerBtn) {
        this.elements.tabManagerBtn.addEventListener('click', () => this.toggleTabManager(true));
    }
    if (this.elements.tabManagerCloseBtn) {
        this.elements.tabManagerCloseBtn.addEventListener('click', () => this.toggleTabManager(false));
    }
    if (this.elements.tabManagerOverlay) {
        this.elements.tabManagerOverlay.addEventListener('click', () => this.toggleTabManager(false));
    }
    if (this.elements.tabManagerSearchInput) {
        this.elements.tabManagerSearchInput.addEventListener('input', (e) => this.filterTabManagerNotes(e.target.value));
    }

    // Close All Tabs Modal Events
    if (this.elements.cancelCloseAllBtn) {
        this.elements.cancelCloseAllBtn.addEventListener('click', () => this.hideCloseAllModal());
    }

    console.log('UI Initialized');
  },





  updateHighlighter(text) {
      // Escape HTML first
      let html = this._escapeHtml(text);

      // Yellow Comments Highlighting (# ...)
      // We use a regex to find lines starting with # and wrap them in a span
      // Use amber-600 for light mode (readable) and yellow-400 for dark mode
      html = html.replace(/^#(.*$)/gm, '<span class="text-amber-600 dark:text-yellow-400">#$1</span>');
      
      // Variable Assignment Highlighting (var = value or $var = value)
      // Match variable names (with or without $) followed by = and a value
      // Use teal-600 for both modes - works well on both light and dark backgrounds
      html = html.replace(/^(\$?[a-zA-Z_][a-zA-Z0-9_]*)\s*(=)/gm, '<span class="text-teal-600">$1</span> $2');
      
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



  toggleSpotlight(show) {
    if (show) {
        this.elements.spotlightOverlay.classList.remove('hidden');
        this.elements.spotlightInput.focus();
    } else {
        this.elements.spotlightOverlay.classList.add('hidden');
        this.elements.editor.focus();
    }
  },

  toggleSidebar(show) {
      const { sidebar, sidebarOverlay } = this.elements;
      if (!sidebar || !sidebarOverlay) return;

      if (show) {
          sidebarOverlay.classList.remove('hidden');
          sidebar.classList.remove('hidden');
          // Trigger reflow
          void sidebar.offsetWidth;
          
          sidebarOverlay.classList.remove('opacity-0');
          sidebar.classList.remove('-translate-x-full');
      } else {
          sidebarOverlay.classList.add('opacity-0');
          sidebar.classList.add('-translate-x-full');
          
          setTimeout(() => {
              sidebarOverlay.classList.add('hidden');
              sidebar.classList.add('hidden');
          }, 300);
      }
  },

  toggleTabManager(show) {
      const { tabManagerSidebar, tabManagerOverlay } = this.elements;
      if (!tabManagerSidebar || !tabManagerOverlay) return;

      if (show) {
          tabManagerOverlay.classList.remove('hidden');
          // Trigger reflow
          void tabManagerSidebar.offsetWidth;
          
          tabManagerOverlay.classList.remove('opacity-0');
          tabManagerSidebar.classList.remove('-translate-x-full');
      } else {
          tabManagerOverlay.classList.add('opacity-0');
          tabManagerSidebar.classList.add('-translate-x-full');
          
          setTimeout(() => {
              tabManagerOverlay.classList.add('hidden');
          }, 300);
      }
  },

  showCloseAllModal() {
      const { closeAllModal, closeAllModalOverlay } = this.elements;
      if (!closeAllModal || !closeAllModalOverlay) return;
      
      closeAllModal.classList.remove('hidden');
      closeAllModalOverlay.classList.remove('hidden');
      
      // Trigger reflow
      void closeAllModal.offsetWidth;
      
      closeAllModal.classList.remove('opacity-0', 'scale-95');
      closeAllModalOverlay.classList.remove('opacity-0');
  },

  hideCloseAllModal() {
      const { closeAllModal, closeAllModalOverlay } = this.elements;
      if (!closeAllModal || !closeAllModalOverlay) return;
      
      closeAllModal.classList.add('opacity-0', 'scale-95');
      closeAllModalOverlay.classList.add('opacity-0');
      
      setTimeout(() => {
          closeAllModal.classList.add('hidden');
          closeAllModalOverlay.classList.add('hidden');
      }, 300);
  },

  renderTabManagerItems(notes, activeNoteId) {
      if (!this.elements.tabManagerList) return;
      
      // Store notes for filtering
      this.tabManagerNotes = notes;
      this.tabManagerActiveNoteId = activeNoteId;
      
      // Clear search input when re-rendering
      if (this.elements.tabManagerSearchInput) {
          this.elements.tabManagerSearchInput.value = '';
      }
      
      this._renderTabManagerList(notes, activeNoteId);
  },

  filterTabManagerNotes(query) {
      if (!this.tabManagerNotes) return;
      
      const searchTerm = query.toLowerCase().trim();
      
      if (!searchTerm) {
          // Show all notes if search is empty
          this._renderTabManagerList(this.tabManagerNotes, this.tabManagerActiveNoteId);
          return;
      }
      
      // Filter notes based on content
      const filteredNotes = this.tabManagerNotes.filter(note => {
          const content = (note.content || '').toLowerCase();
          const firstLine = content.split('\n')[0].trim();
          return content.includes(searchTerm) || firstLine.includes(searchTerm);
      });
      
      this._renderTabManagerList(filteredNotes, this.tabManagerActiveNoteId);
  },

  _renderTabManagerList(notes, activeNoteId) {
      if (!this.elements.tabManagerList) return;
      
      this.elements.tabManagerList.innerHTML = '';
      
      if (notes.length === 0) {
          this.elements.tabManagerList.innerHTML = '<div class="p-4 text-center text-zinc-500 text-sm font-mono">No notes found</div>';
          return;
      }

      notes.forEach(note => {
          const isActive = note.id === activeNoteId;
          const content = note.content || '';
          const firstLine = content.split('\n')[0].trim();
          const title = firstLine || 'New Note';
          const displayTitle = this._getDisplayTitle(title);
          const date = this._formatSidebarDate(note.updatedAt || note.createdAt);

          const el = document.createElement('div');
          el.className = `p-3 mb-1 rounded-lg cursor-pointer flex justify-between items-center group transition-colors ${
              isActive 
                  ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white font-medium' 
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`;
          
          el.innerHTML = `
              <div class="flex flex-col overflow-hidden flex-1">
                  <span class="font-mono text-sm truncate">${this._escapeHtml(displayTitle)}</span>
                  <span class="text-[10px] font-mono opacity-60">${date}</span>
              </div>
              <div class="flex items-center gap-2">
                  ${isActive ? '<div class="w-1.5 h-1.5 rounded-full bg-blue-500"></div>' : ''}
                  <div class="delete-note-container flex items-center">
                      <button class="tab-manager-delete p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors opacity-0 group-hover:opacity-100" data-delete-note="${note.id}" title="Delete Note">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                      </button>
                      <button class="tab-manager-confirm-delete hidden p-1.5 text-green-500 hover:text-green-600 hover:bg-green-500/10 rounded transition-colors" data-confirm-delete="${note.id}" title="Confirm Delete">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                      </button>
                      <button class="tab-manager-cancel-delete hidden p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-500/10 rounded transition-colors" data-cancel-delete="${note.id}" title="Cancel">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18"></line>
                              <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                      </button>
                  </div>
              </div>
          `;
          
          el.dataset.id = note.id;
          this.elements.tabManagerList.appendChild(el);
      });
  },

  renderSidebarItems(notes, activeNoteId) {
      if (!this.elements.sidebarList) return;
      
      // Store notes for filtering
      this.sidebarNotes = notes;
      this.sidebarActiveNoteId = activeNoteId;
      
      // Clear search input when re-rendering
      if (this.elements.sidebarSearchInput) {
          this.elements.sidebarSearchInput.value = '';
      }
      
      this._renderSidebarList(notes, activeNoteId);
  },

  filterSidebarNotes(query) {
      if (!this.sidebarNotes) return;
      
      const searchTerm = query.toLowerCase().trim();
      
      if (!searchTerm) {
          // Show all notes if search is empty
          this._renderSidebarList(this.sidebarNotes, this.sidebarActiveNoteId);
          return;
      }
      
      // Filter notes based on content
      const filteredNotes = this.sidebarNotes.filter(note => {
          const content = (note.content || '').toLowerCase();
          const firstLine = content.split('\n')[0].trim();
          return content.includes(searchTerm) || firstLine.includes(searchTerm);
      });
      
      this._renderSidebarList(filteredNotes, this.sidebarActiveNoteId);
  },

  _renderSidebarList(notes, activeNoteId) {
      if (!this.elements.sidebarList) return;
      
      this.elements.sidebarList.innerHTML = '';
      
      if (notes.length === 0) {
          this.elements.sidebarList.innerHTML = '<div class="p-4 text-center text-zinc-500 text-sm font-mono">No notes found</div>';
          return;
      }

        notes.forEach(note => {
          const isActive = note.id === activeNoteId;
          const content = note.content || '';
          const firstLine = content.split('\n')[0].trim();
            const title = firstLine || 'New Note';
            const displayTitle = this._getDisplayTitle(title);
            const date = this._formatSidebarDate(note.updatedAt || note.createdAt);

          const el = document.createElement('div');
          el.className = `p-3 mb-1 rounded-lg cursor-pointer flex justify-between items-center transition-colors ${
              isActive 
                  ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white font-medium' 
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`;
          
          el.innerHTML = `
                <div class="flex flex-col overflow-hidden">
                  <span class="font-mono text-sm truncate sidebar-note-title">${this._escapeHtml(displayTitle)}</span>
                  <span class="text-[10px] font-mono opacity-60 sidebar-note-date">${date}</span>
              </div>
              ${isActive ? '<div class="w-1.5 h-1.5 rounded-full bg-blue-500"></div>' : ''}
          `;
          
          el.dataset.id = note.id;
          this.elements.sidebarList.appendChild(el);
      });
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
      
      const content = note.content || '';
      const firstLine = content.split('\n')[0].trim();
      const title = firstLine || 'New Note';
      const date = this._formatSidebarDate(note.updatedAt);

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
    const defaultPlaceholder = `Start typing your calculation...

Examples:
100 + 50
20% of 150
$100 in EUR
tax = 22%
price = 1000
price + tax`;

    if (!note) {
      this.elements.editor.value = '';
      this.elements.editor.placeholder = defaultPlaceholder;
      this.elements.editor.disabled = true;
      this.updateNoteTitle('New Note');
      this.updateTimestamp(Date.now());
      this.renderResults([]);
      this.updateHighlighter('');
      return;
    }

    this.elements.editor.disabled = false;
    this.elements.editor.placeholder = defaultPlaceholder;
    this.elements.editor.value = note.content;
    
    this.calculateAndRender(note.content);
    this.updateHighlighter(note.content);

    // Update title
    const content = note.content || '';
    const firstLine = content.split('\n')[0].trim();
    const title = firstLine || 'New Note';
    this.updateNoteTitle(title);
    
    // Update timestamp (always show date, even for new notes)
    this.updateTimestamp(note.updatedAt || note.createdAt || Date.now());
  },

  updateNoteTitle(title) {
    // Update mobile title display
    if (this.elements.noteTitleDisplay) {
      this.elements.noteTitleDisplay.textContent = title || 'New Note';
    }
  },

  updateTimestamp(timestamp) {
    // Update desktop timestamp
    if (!this.elements.timestamp) return;
    
    if (!timestamp) {
      this.elements.timestamp.textContent = '';
      if (this.elements.timestampDisplayMobile) {
        this.elements.timestampDisplayMobile.textContent = '';
      }
      return;
    }
    
    try {
      const date = new Date(timestamp);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        this.elements.timestamp.textContent = '';
        if (this.elements.timestampDisplayMobile) {
          this.elements.timestampDisplayMobile.textContent = '';
        }
        return;
      }
      
      // Full format for desktop
      this.elements.timestamp.textContent = date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      
      // Short format for mobile
      if (this.elements.timestampDisplayMobile) {
        this.elements.timestampDisplayMobile.textContent = date.toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    } catch (e) {
      console.error('Error formatting date:', e);
      this.elements.timestamp.textContent = '';
      if (this.elements.timestampDisplayMobile) {
        this.elements.timestampDisplayMobile.textContent = '';
      }
    }
  },

  updateTabMetadata(noteId, title) {
    if (!this.elements.tabBar) return;
    const tab = this.elements.tabBar.querySelector(`[data-tab-id="${noteId}"]`);
    if (!tab) return;
    const label = tab.querySelector('.tab-title');
      if (label) {
        label.textContent = this._getDisplayTitle(title);
    }
  },

  updateSidebarMetadata(noteId, title, updatedAt) {
    if (!this.elements.sidebarList) return;
    const el = this.elements.sidebarList.querySelector(`[data-id="${noteId}"]`);
    if (!el) return;
    const titleEl = el.querySelector('.sidebar-note-title');
    if (titleEl) {
      titleEl.textContent = this._getDisplayTitle(title || 'New Note');
    }
    const dateEl = el.querySelector('.sidebar-note-date');
    if (dateEl) {
      dateEl.textContent = this._formatSidebarDate(updatedAt);
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

  _escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
 },

  _getDisplayTitle(title) {
    const safeTitle = title || 'New Note';
    return safeTitle.length > 20 ? `${safeTitle.substring(0, 20)}...` : safeTitle;
  },

  _formatSidebarDate(timestamp) {
    if (!timestamp) return '';
    try {
      return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch (e) {
      return '';
    }
  },


 initTheme(noteId = null) {
    let savedTheme;
    if (noteId) {
      // Try to get per-note theme first
      savedTheme = localStorage.getItem(`numla-theme-${noteId}`);
    }
    // Fall back to global theme if no per-note theme
    if (!savedTheme) {
      savedTheme = localStorage.getItem('numla-theme');
    }
    // Default to dark if not set, or if set to dark
    const isDark = savedTheme === 'light' ? false : true;
    this.setTheme(isDark, noteId);
 },

 currentNoteId: null,

 setCurrentNoteId(noteId) {
    this.currentNoteId = noteId;
 },

 setTheme(isDark, noteId = null) {
    console.log('Setting theme:', isDark ? 'dark' : 'light');
    if (isDark) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    // Save global preference
    localStorage.setItem('numla-theme', isDark ? 'dark' : 'light');
    // Save per-note preference if noteId provided
    const id = noteId || this.currentNoteId;
    if (id) {
      localStorage.setItem(`numla-theme-${id}`, isDark ? 'dark' : 'light');
    }
    this.updateThemeSwitch(isDark);
 },

 toggleTheme() {
    const isDark = document.documentElement.classList.contains('dark');
    this.setTheme(!isDark);
 },

 updateThemeSwitch(isDark) {
    // Theme icons are automatically toggled via Tailwind's dark: classes
    // No manual DOM manipulation needed
 }
};
