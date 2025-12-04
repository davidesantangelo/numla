import { store } from './store.js';
import { ui, debounce } from './ui.js';
import { initTour, startTour, resetTour } from './tour.js';
import { timeMachine } from './timeMachine.js';
import { historyStore } from './historyStore.js';

let activeNoteId = null;
let spotlightIndex = 0;
let isSpotlightOpen = false;
let filteredNotes = [];
let openTabs = []; // Array of note IDs

const TABS_STORAGE_KEY = 'numla-open-tabs';
const ACTIVE_TAB_KEY = 'numla-active-tab';
const CALC_DEBOUNCE_MS = 80;
const SAVE_DEBOUNCE_MS = 200;

const debouncedCalculate = debounce((content) => {
  ui.calculateAndRender(content);
}, CALC_DEBOUNCE_MS);

const debouncedSave = debounce((noteId, content, timestamp) => {
  persistNoteContent(noteId, content, timestamp);
}, SAVE_DEBOUNCE_MS);

export function initApp() {
  ui.init();
  
  // Set up tour callback for help buttons
  ui.onStartTour = () => {
    resetTour(); // Reset to allow re-running
    startTour();
  };
  
  // Initialize Time Machine
  timeMachine.init();
  timeMachine.setCallbacks(
    // On restore callback
    (noteId, content) => {
      if (noteId === activeNoteId) {
        ui.elements.editor.value = content;
        ui.updateHighlighter(content);
        ui.calculateAndRender(content);
        persistNoteContent(noteId, content, Date.now());
        const title = getTitleFromContent(content);
        ui.updateNoteTitle(title);
        ui.updateTabMetadata(noteId, title);
      }
    },
    // On close callback
    () => {
      ui.elements.editor.focus();
    }
  );
  
  // Listen for Time Machine preview events
  window.addEventListener('timemachine:preview', (e) => {
    const { content, isLatest } = e.detail;
    // Show preview content in editor (read-only feel)
    ui.elements.editor.value = content;
    ui.updateHighlighter(content);
    ui.calculateAndRender(content);
  });
  
  // Listen for Time Machine close events (restore original)
  window.addEventListener('timemachine:close', (e) => {
    const { content } = e.detail;
    if (content !== undefined) {
      ui.elements.editor.value = content;
      ui.updateHighlighter(content);
      ui.calculateAndRender(content);
    }
  });
  
  setupEventListeners();
  
  // Load tabs from localStorage
  const savedTabs = localStorage.getItem(TABS_STORAGE_KEY);
  const savedActiveTab = localStorage.getItem(ACTIVE_TAB_KEY);
  
  if (savedTabs) {
    try {
      openTabs = JSON.parse(savedTabs);
      // Filter out any tabs that no longer exist
      const notes = store.getNotes();
      const validNoteIds = new Set(notes.map(n => n.id));
      openTabs = openTabs.filter(id => validNoteIds.has(id));
    } catch (e) {
      openTabs = [];
    }
  }
  
  // Restore tabs or create new one
  if (openTabs.length > 0) {
    // Restore tabs and active tab
    renderTabs();
    const tabToActivate = (savedActiveTab && openTabs.includes(savedActiveTab)) 
      ? savedActiveTab 
      : openTabs[0];
    selectNote(tabToActivate);
  } else {
    // No saved tabs, load first note or create new one
    const notes = store.getNotes();
    if (notes.length > 0) {
      openTab(notes[0].id);
    } else {
      createNewNote();
    }
  }

  // Initialize the interactive tour for first-time users
  initTour();
}

// Export tour functions for manual control
export { startTour, resetTour };

function openSpotlight() {
  isSpotlightOpen = true;
  ui.toggleSpotlight(true);
  renderSpotlight();
}

function closeSpotlight() {
  isSpotlightOpen = false;
  ui.toggleSpotlight(false);
}

function renderSpotlight() {
  const query = ui.elements.spotlightInput.value.toLowerCase();
  const notes = store.getNotes();
  
  // Filter out empty notes (Untitled) from search
  const nonEmptyNotes = notes.filter(n => n.content && n.content.trim() !== '');
  
  if (query) {
    filteredNotes = nonEmptyNotes.filter(n => n.content.toLowerCase().includes(query));
  } else {
    filteredNotes = nonEmptyNotes;
  }
  
  // Reset index if out of bounds
  if (spotlightIndex >= filteredNotes.length) {
    spotlightIndex = Math.max(0, filteredNotes.length - 1);
  }
  
  ui.renderSpotlightItems(filteredNotes, spotlightIndex);
}

function openTab(id) {
  if (!openTabs.includes(id)) {
    openTabs.push(id);
    saveTabs();
  }
  selectNote(id);
}

function closeTab(id) {
  const index = openTabs.indexOf(id);
  if (index === -1) return;

  if (activeNoteId === id) {
    flushPendingEditorWork();
  }

  openTabs.splice(index, 1);
  saveTabs();

  // If we closed the active tab, switch to another one
  if (activeNoteId === id) {
    if (openTabs.length > 0) {
      // Try to go to the left, otherwise right
      const newIndex = Math.max(0, index - 1);
      selectNote(openTabs[newIndex]);
    } else {
      // No tabs left - automatically create a new note
      createNewNote();
    }
  } else {
    renderTabs();
  }
}

function saveTabs() {
  localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(openTabs));
  if (activeNoteId) {
    localStorage.setItem(ACTIVE_TAB_KEY, activeNoteId);
  }
}

function renderTabs() {
  if (!ui.elements.tabBar) return;
  
  const notes = store.getNotes();
  const noteMap = new Map(notes.map(note => [note.id, note]));
  
  // Clear previous content and event listeners by replacing innerHTML
  ui.elements.tabBar.innerHTML = openTabs.map(tabId => {
    const note = noteMap.get(tabId);
    if (!note) return '';
    
    const isActive = tabId === activeNoteId;
    const firstLine = (note.content || '').split('\n')[0].trim();
    const title = firstLine || 'New Note';
    const displayTitle = ui._getDisplayTitle(title);
    
    return `
      <div class="tab-item flex-shrink-0 snap-start flex items-center gap-2 px-6 h-full text-sm font-mono cursor-pointer transition-all ${
        isActive 
          ? 'text-zinc-900 dark:text-white bg-white dark:bg-black shadow-sm border-t border-x border-zinc-200/50 dark:border-zinc-800/50' 
          : 'text-zinc-500 dark:text-zinc-500 bg-zinc-200/50 dark:bg-zinc-800/50 hover:bg-zinc-200 dark:hover:bg-zinc-800 border-t border-x border-transparent'
      }" data-tab-id="${tabId}">
        <span class="tab-title truncate max-w-[200px]">${ui._escapeHtml(displayTitle)}</span>
        <button class="tab-close ml-1 p-0.5 hover:bg-zinc-300/50 dark:hover:bg-zinc-700/50 transition-colors" data-close-tab="${tabId}">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    `;
  }).join('');
  
  // Use event delegation on tabBar instead of individual listeners
  // This prevents memory leaks from repeated listener additions
  
  // Add "new tab" button at the end
  const newTabBtn = document.createElement('button');
  newTabBtn.className = 'flex-shrink-0 snap-start flex items-center justify-center w-12 h-12 text-zinc-400 dark:text-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/30 transition-colors';
  newTabBtn.title = 'New Note (⌘J)';
  newTabBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  `;
  newTabBtn.addEventListener('click', () => {
    createNewNote();
  });
  ui.elements.tabBar.appendChild(newTabBtn);
  
  // Also render sidebar items whenever tabs are rendered
  ui.renderSidebarItems(notes, activeNoteId);
  
  // Also render tab manager items (all notes) whenever tabs are rendered
  ui.renderTabManagerItems(notes, activeNoteId);
}

function selectNote(id) {
  if (activeNoteId && activeNoteId !== id) {
    flushPendingEditorWork();
  } else {
    debouncedCalculate.cancel();
    debouncedSave.cancel();
  }
  activeNoteId = id;
  localStorage.setItem(ACTIVE_TAB_KEY, id);
  const notes = store.getNotes();
  const note = notes.find(n => n.id === id);
  
  // Set current note ID for theme saving
  ui.setCurrentNoteId(id);
  
  // Load theme preference for this note
  ui.initTheme(id);
  
  ui.updateEditor(note);
  renderTabs();
  
  // Always focus the editor
  ui.elements.editor.focus();
  
  // Close sidebar on mobile when selecting a note
  ui.toggleSidebar(false);

  // Scroll active tab into view
  setTimeout(() => {
    const activeTab = ui.elements.tabBar.querySelector(`[data-tab-id="${id}"]`);
    if (activeTab) {
      activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, 10);
}

function createNewNote() {
  // Check if there's already an empty note
  const notes = store.getNotes();
  const existingEmpty = notes.find(n => !n.content || n.content.trim() === '');
  
  if (existingEmpty) {
    // Open the existing empty note instead of creating a new one
    closeSpotlight();
    openTab(existingEmpty.id);
    ui.elements.editor.focus();
    return;
  }
  
  const newNote = store.createNote();
  closeSpotlight();
  openTab(newNote.id);
  ui.elements.editor.focus();
}


function getTitleFromContent(content) {
  const firstLine = (content || '').split('\n')[0].trim();
  return firstLine || 'New Note';
}

function persistNoteContent(noteId, content, timestamp = Date.now()) {
  if (!noteId) return;
  const note = store.getNoteById(noteId);
  if (!note) return;
  store.saveNote({ ...note, content, updatedAt: timestamp });
}

function flushPendingEditorWork() {
  if (!activeNoteId || !ui.elements.editor) return;
  debouncedCalculate.cancel();
  debouncedSave.cancel();
  persistNoteContent(activeNoteId, ui.elements.editor.value, Date.now());
}

function deleteNoteFromManager(noteId) {
  // Delete the note from store
  store.deleteNote(noteId);
  
  // Close the tab if it's open
  const tabIndex = openTabs.indexOf(noteId);
  if (tabIndex !== -1) {
    openTabs.splice(tabIndex, 1);
    saveTabs();
  }
  
  // If we deleted the active note, switch to another one
  if (activeNoteId === noteId) {
    if (openTabs.length > 0) {
      selectNote(openTabs[0]);
    } else {
      createNewNote();
    }
  } else {
    renderTabs();
  }
}

function deleteAllNotes() {
  // Flush pending work first
  flushPendingEditorWork();
  
  // Get all notes and delete them
  const notes = store.getNotes();
  notes.forEach(note => store.deleteNote(note.id));
  
  // Clear all tabs
  openTabs = [];
  activeNoteId = null;
  saveTabs();
  
  // Create a new note to ensure there's always something open
  createNewNote();
}



function setupEventListeners() {
  // Tab Bar Event Delegation (prevents memory leaks from repeated listener additions)
  if (ui.elements.tabBar) {
    ui.elements.tabBar.addEventListener('click', (e) => {
      // Handle close button clicks
      const closeBtn = e.target.closest('.tab-close');
      if (closeBtn) {
        e.stopPropagation();
        const tabId = closeBtn.dataset.closeTab;
        if (tabId) {
          closeTab(tabId);
        }
        return;
      }
      
      // Handle tab clicks
      const tab = e.target.closest('.tab-item');
      if (tab) {
        const tabId = tab.dataset.tabId;
        if (tabId && tabId !== activeNoteId) {
          selectNote(tabId);
        }
      }
    });
  }

  // Global Shortcuts
  window.addEventListener('keydown', (e) => {
    const isCmdOrCtrl = e.metaKey || e.ctrlKey;

    // ESC -> Exit Focus Mode (if in focus mode and spotlight is not open)
    if (e.code === 'Escape' && !isSpotlightOpen) {
      if (document.body.classList.contains('focus-mode')) {
        e.preventDefault();
        ui.exitFocusMode();
        return;
      }
    }

    // Cmd+K -> Toggle Spotlight (Search)
    if (isCmdOrCtrl && e.code === 'KeyK') {
      e.preventDefault();
      e.stopPropagation();
      if (isSpotlightOpen) {
        closeSpotlight();
      } else {
        openSpotlight();
      }
      return;
    }

    // Cmd+J -> New Note
    if (isCmdOrCtrl && e.code === 'KeyJ') {
      e.preventDefault();
      e.stopPropagation();
      createNewNote();
      return;
    }

    // Cmd+E -> Toggle Time Machine
    if (isCmdOrCtrl && e.code === 'KeyE') {
      e.preventDefault();
      e.stopPropagation();
      if (!timeMachine.isOpen() && activeNoteId) {
        const currentContent = ui.elements.editor.value;
        timeMachine.open(activeNoteId, currentContent);
      } else if (timeMachine.isOpen()) {
        timeMachine.close();
      }
      return;
    }


    // Spotlight Navigation
    if (isSpotlightOpen) {
        if (e.code === 'ArrowDown') {
            e.preventDefault();
            spotlightIndex = Math.min(spotlightIndex + 1, filteredNotes.length - 1);
            ui.renderSpotlightItems(filteredNotes, spotlightIndex);
        } else if (e.code === 'ArrowUp') {
            e.preventDefault();
            spotlightIndex = Math.max(spotlightIndex - 1, 0);
            ui.renderSpotlightItems(filteredNotes, spotlightIndex);
        } else if (e.code === 'Enter') {
            e.preventDefault();
            if (filteredNotes.length > 0) {
                openTab(filteredNotes[spotlightIndex].id);
                closeSpotlight();
            }
        } else if (e.code === 'Escape') {
            e.preventDefault();
            closeSpotlight();
        }
    }
  }, { capture: true });

  // Spotlight Input
  ui.elements.spotlightInput.addEventListener('input', () => {
    spotlightIndex = 0;
    renderSpotlight();
  });

  // Spotlight Click
  ui.elements.spotlightList.addEventListener('click', (e) => {
    const el = e.target.closest('[data-id]');
    if (el) {
      openTab(el.dataset.id);
      closeSpotlight();
    }
  });


  // Delete Button -> Show Delete Modal
  ui.elements.deleteBtn.addEventListener('click', () => {
    if (activeNoteId) ui.showDeleteModal();
  });

  // Mobile Delete Button -> Show Delete Modal
  if (ui.elements.deleteBtnMobile) {
    ui.elements.deleteBtnMobile.addEventListener('click', () => {
      if (activeNoteId) ui.showDeleteModal();
    });
  }

  // Export Button -> Download note as text file
  ui.elements.exportBtn.addEventListener('click', () => {
    if (!activeNoteId) return;
    
    const notes = store.getNotes();
    const currentNote = notes.find(n => n.id === activeNoteId);
    if (!currentNote) return;
    
    const content = currentNote.content || '';
    const firstLine = content.split('\n')[0].trim();
    const filename = (firstLine || 'note') + '.txt';
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // Mobile Export Button -> Download note as text file
  if (ui.elements.exportBtnMobile) {
    ui.elements.exportBtnMobile.addEventListener('click', () => {
      if (!activeNoteId) return;
      
      const notes = store.getNotes();
      const currentNote = notes.find(n => n.id === activeNoteId);
      if (!currentNote) return;
      
      const content = currentNote.content || '';
      const firstLine = content.split('\n')[0].trim();
      const filename = (firstLine || 'note') + '.txt';
      
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  // Confirm Delete Button (Modal)
  ui.elements.confirmDeleteBtn.addEventListener('click', () => {
      if (activeNoteId) {
          store.deleteNote(activeNoteId);
          closeTab(activeNoteId);
          ui.hideDeleteModal();
      }
  });

  // Editor Input (Auto-save)
  ui.elements.editor.addEventListener('input', (e) => {
    if (!activeNoteId) return;
    const content = e.target.value;
    const timestamp = Date.now();
    const title = getTitleFromContent(content);

    ui.updateNoteTitle(title);
    ui.updateTimestamp(timestamp);
    ui.updateTabMetadata(activeNoteId, title);
    ui.updateSidebarMetadata(activeNoteId, title, timestamp);

    debouncedCalculate(content);
    debouncedSave(activeNoteId, content, timestamp);
  });

  // Sidebar List Click
  if (ui.elements.sidebarList) {
      ui.elements.sidebarList.addEventListener('click', (e) => {
          const el = e.target.closest('[data-id]');
          if (el) {
              openTab(el.dataset.id);
          }
      });
  }

  // Sidebar New Note Button
  if (ui.elements.sidebarNewBtn) {
      ui.elements.sidebarNewBtn.addEventListener('click', () => {
          createNewNote();
          ui.toggleSidebar(false);
      });
  }

  // Tab Manager List Click (select or delete note)
  if (ui.elements.tabManagerList) {
      ui.elements.tabManagerList.addEventListener('click', (e) => {
          // Check if clicked on delete button (first step - show confirm/cancel)
          const deleteBtn = e.target.closest('.tab-manager-delete');
          if (deleteBtn) {
              e.stopPropagation();
              const container = deleteBtn.closest('.delete-note-container');
              if (container) {
                  // Hide delete button, show confirm/cancel buttons
                  deleteBtn.classList.add('hidden');
                  container.querySelector('.tab-manager-confirm-delete').classList.remove('hidden');
                  container.querySelector('.tab-manager-cancel-delete').classList.remove('hidden');
              }
              return;
          }
          
          // Check if clicked on confirm delete button
          const confirmBtn = e.target.closest('.tab-manager-confirm-delete');
          if (confirmBtn) {
              e.stopPropagation();
              const noteId = confirmBtn.dataset.confirmDelete;
              if (noteId) {
                  deleteNoteFromManager(noteId);
              }
              return;
          }
          
          // Check if clicked on cancel delete button
          const cancelBtn = e.target.closest('.tab-manager-cancel-delete');
          if (cancelBtn) {
              e.stopPropagation();
              const container = cancelBtn.closest('.delete-note-container');
              if (container) {
                  // Hide confirm/cancel buttons, show delete button
                  container.querySelector('.tab-manager-delete').classList.remove('hidden');
                  container.querySelector('.tab-manager-confirm-delete').classList.add('hidden');
                  container.querySelector('.tab-manager-cancel-delete').classList.add('hidden');
              }
              return;
          }
          
          // Otherwise select the note
          const el = e.target.closest('[data-id]');
          if (el) {
              openTab(el.dataset.id);
              ui.toggleTabManager(false);
          }
      });
  }

  // Delete All Notes Button -> Show confirmation modal
  if (ui.elements.deleteAllNotesBtn) {
      ui.elements.deleteAllNotesBtn.addEventListener('click', () => {
          const notes = store.getNotes();
          if (notes.length > 0) {
              ui.showCloseAllModal();
          }
      });
  }

  // Confirm Delete All Notes
  if (ui.elements.confirmCloseAllBtn) {
      ui.elements.confirmCloseAllBtn.addEventListener('click', () => {
          deleteAllNotes();
          ui.hideCloseAllModal();
          ui.toggleTabManager(false);
      });
  }

  // Time Machine Button (Desktop)
  const timeMachineBtn = document.getElementById('time-machine-btn');
  if (timeMachineBtn) {
      timeMachineBtn.addEventListener('click', () => {
          if (!timeMachine.isOpen() && activeNoteId) {
              const currentContent = ui.elements.editor.value;
              timeMachine.open(activeNoteId, currentContent);
          } else if (timeMachine.isOpen()) {
              timeMachine.close();
          }
      });
  }

  // Time Machine Button (Mobile)
  const timeMachineBtnMobile = document.getElementById('time-machine-btn-mobile');
  if (timeMachineBtnMobile) {
      timeMachineBtnMobile.addEventListener('click', () => {
          if (!timeMachine.isOpen() && activeNoteId) {
              const currentContent = ui.elements.editor.value;
              timeMachine.open(activeNoteId, currentContent);
          } else if (timeMachine.isOpen()) {
              timeMachine.close();
          }
      });
  }
}
