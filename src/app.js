import { store } from './store.js';
import { ui } from './ui.js';

let activeNoteId = null;
let spotlightIndex = 0;
let isSpotlightOpen = false;
let filteredNotes = [];
let openTabs = []; // Array of note IDs

const TABS_STORAGE_KEY = 'numla-open-tabs';
const ACTIVE_TAB_KEY = 'numla-active-tab';

export function initApp() {
  ui.init();
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
}

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
  
  ui.elements.tabBar.innerHTML = openTabs.map(tabId => {
    const note = notes.find(n => n.id === tabId);
    if (!note) return '';
    
    const isActive = tabId === activeNoteId;
    const firstLine = (note.content || '').split('\n')[0].trim();
    const title = firstLine || 'New Note';
    const displayTitle = title.length > 20 ? title.substring(0, 20) + '...' : title;
    
    return `
      <div class="tab-item flex items-center gap-1 px-3 py-1.5 text-xs font-mono cursor-pointer transition-all border-b-2 ${
        isActive 
          ? 'text-zinc-900 dark:text-white border-blue-500 bg-white/50 dark:bg-zinc-800/50' 
          : 'text-zinc-500 dark:text-zinc-500 border-transparent hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/30'
      }" data-tab-id="${tabId}">
        <span class="tab-title truncate max-w-[120px]">${ui._escapeHtml(displayTitle)}</span>
        <button class="tab-close ml-1 p-0.5 rounded hover:bg-zinc-300/50 dark:hover:bg-zinc-700/50 transition-colors" data-close-tab="${tabId}">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    `;
  }).join('');
  
  // Add click handlers for tabs
  ui.elements.tabBar.querySelectorAll('.tab-item').forEach(tab => {
    tab.addEventListener('click', (e) => {
      // Don't switch tab if clicking close button
      if (e.target.closest('.tab-close')) return;
      const tabId = tab.dataset.tabId;
      if (tabId && tabId !== activeNoteId) {
        selectNote(tabId);
      }
    });
  });
  
  // Add click handlers for close buttons
  ui.elements.tabBar.querySelectorAll('.tab-close').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const tabId = btn.dataset.closeTab;
      if (tabId) {
        closeTab(tabId);
      }
    });
  });
  
  // Add "new tab" button at the end
  const newTabBtn = document.createElement('button');
  newTabBtn.className = 'flex items-center justify-center w-8 h-8 ml-1 text-zinc-400 dark:text-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/30 rounded transition-colors';
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
}

function selectNote(id) {
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



function setupEventListeners() {
  // Global Shortcuts
  window.addEventListener('keydown', (e) => {
    const isCmdOrCtrl = e.metaKey || e.ctrlKey;

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
    
    // Trigger calculation
    ui.calculateAndRender(content);

    const notes = store.getNotes();
    const currentNote = notes.find(n => n.id === activeNoteId);
    
    if (currentNote) {
      store.saveNote({ ...currentNote, content });
      // Update title in bottom bar
      const firstLine = content.split('\n')[0].trim();
      const title = firstLine || 'New Note';
      ui.updateNoteTitle(title);
      // Update timestamp
      ui.updateTimestamp(Date.now());
      renderTabs();
    }
  });
}
