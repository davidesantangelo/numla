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
  
  // Filter out empty notes (notes without content or with only whitespace)
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
  const notes = store.getNotes();
  const tabs = openTabs.map(id => notes.find(n => n.id === id)).filter(Boolean);
  ui.renderTabs(tabs, activeNoteId);
}

function selectNote(id) {
  activeNoteId = id;
  localStorage.setItem(ACTIVE_TAB_KEY, id);
  const notes = store.getNotes();
  const note = notes.find(n => n.id === id);
  
  ui.updateEditor(note);
  renderTabs();
}

function createNewNote() {
  const newNote = store.createNote();
  closeSpotlight();
  openTab(newNote.id);
  ui.elements.editor.focus();
}



function setupEventListeners() {
  // Global Shortcuts
  // Global Shortcuts
  window.addEventListener('keydown', (e) => {
    const isCmdOrCtrl = e.metaKey || e.ctrlKey;

    // Cmd+K -> Toggle Spotlight
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

  // Tab Bar Click
  ui.elements.tabBar.addEventListener('click', (e) => {
    // Check for close button
    const closeBtn = e.target.closest('[data-action="close-tab"]');
    if (closeBtn) {
        e.stopPropagation();
        closeTab(closeBtn.dataset.id);
        return;
    }

    // Check for new tab button
    const newTabBtn = e.target.closest('[data-action="new-tab"]');
    if (newTabBtn) {
        createNewNote();
        return;
    }

    // Check for tab click
    const tabEl = e.target.closest('[data-id]');
    if (tabEl) {
        selectNote(tabEl.dataset.id);
    }
  });

  // Menu Button
  ui.elements.menuBtn.addEventListener('click', openSpotlight);

  // Delete Button
  ui.elements.deleteBtn.addEventListener('click', () => {
      if (activeNoteId) ui.showDeleteModal();
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
      ui.updateTimestamp(Date.now());
      ui.toggleBottomBarInfo(true);
      renderTabs(); // Update tab title

    }
  });

  // Theme Toggle
  if (ui.elements.themeBtn) {
      ui.elements.themeBtn.addEventListener('click', () => {
          ui.toggleTheme();
      });
  }
}
