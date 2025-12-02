const STORAGE_KEY = 'numla-notes';
const MAX_NOTES = 500; // Maximum number of notes to prevent memory issues
const MAX_NOTE_SIZE = 500000; // 500KB max per note

let notesCache = null;
let cacheVersion = null;

function ensureCache() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (notesCache && raw === cacheVersion) {
    return notesCache;
  }

  if (!raw) {
    notesCache = [];
    cacheVersion = null;
    return notesCache;
  }

  try {
    const parsed = JSON.parse(raw);
    const validNotes = parsed.filter(n =>
      n &&
      typeof n === 'object' &&
      n.id &&
      typeof n.content !== 'undefined' &&
      n.createdAt &&
      n.updatedAt
    );

    if (validNotes.length !== parsed.length) {
      const payload = JSON.stringify(validNotes);
      localStorage.setItem(STORAGE_KEY, payload);
      cacheVersion = payload;
    } else {
      cacheVersion = raw;
    }

    notesCache = validNotes;
    return notesCache;
  } catch (e) {
    console.error('Error parsing notes:', e);
    notesCache = [];
    cacheVersion = null;
    return notesCache;
  }
}

export const store = {
  getNotes() {
    return ensureCache().map(note => ({ ...note }));
  },

  getNoteById(id) {
    if (!id) return null;
    const note = ensureCache().find(n => n.id === id);
    return note ? { ...note } : null;
  },

  saveNote(updatedNote) {
    // Validate note structure
    if (!updatedNote || !updatedNote.id) {
      console.error('Invalid note: missing id');
      return null;
    }
    
    // Limit content size
    if (updatedNote.content && updatedNote.content.length > MAX_NOTE_SIZE) {
      updatedNote.content = updatedNote.content.substring(0, MAX_NOTE_SIZE);
      console.warn('Note content truncated to prevent storage issues');
    }
    
    const notes = ensureCache();
    const existingIndex = notes.findIndex(n => n.id === updatedNote.id);
    const timestamp = typeof updatedNote.updatedAt === 'number' ? updatedNote.updatedAt : Date.now();
    
    if (existingIndex >= 0) {
      notes[existingIndex] = { ...notes[existingIndex], ...updatedNote, updatedAt: timestamp };
    } else {
      const createdAt = typeof updatedNote.createdAt === 'number' ? updatedNote.createdAt : timestamp;
      notes.unshift({ ...updatedNote, createdAt, updatedAt: timestamp });
    }
    
    this._persist(notes);
    const saved = notes.find(n => n.id === updatedNote.id);
    return saved ? { ...saved } : null;
  },

  deleteNote(id) {
    const notes = ensureCache().filter(n => n.id !== id);
    this._persist(notes);
  },

  createNote() {
    const notes = ensureCache();
    
    // Check note limit
    if (notes.length >= MAX_NOTES) {
      const overflow = notes.length - MAX_NOTES + 1;
      const sortedByDate = [...notes].sort((a, b) => a.updatedAt - b.updatedAt);
      const idsToRemove = new Set(sortedByDate.slice(0, overflow).map(n => n.id));
      for (let i = notes.length - 1; i >= 0; i--) {
        if (idsToRemove.has(notes[i].id)) {
          notes.splice(i, 1);
        }
      }
      console.warn(`Removed ${overflow} old notes to maintain limit`);
    }
    
    const timestamp = Date.now();
    const newNote = {
      id: crypto.randomUUID(),
      content: '',
      createdAt: timestamp,
      updatedAt: timestamp
    };
    notes.unshift(newNote);
    this._persist(notes);
    return { ...newNote };
  },

  _persist(notes) {
    const payload = JSON.stringify(notes);
    notesCache = notes;
    cacheVersion = payload;
    localStorage.setItem(STORAGE_KEY, payload);
  }
};
