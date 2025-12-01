const STORAGE_KEY = 'numla-notes';
const MAX_NOTES = 500; // Maximum number of notes to prevent memory issues
const MAX_NOTE_SIZE = 500000; // 500KB max per note

export const store = {
  getNotes() {
    const notes = localStorage.getItem(STORAGE_KEY);
    if (!notes) return [];
    
    try {
      const parsed = JSON.parse(notes);
      // Filter out invalid notes (corrupted data)
      const validNotes = parsed.filter(n => 
        n && 
        typeof n === 'object' && 
        n.id && 
        typeof n.content !== 'undefined' &&
        n.createdAt &&
        n.updatedAt
      );
      
      // If we filtered out any notes, save the cleaned list
      if (validNotes.length !== parsed.length) {
        this._persist(validNotes);
      }
      
      return validNotes;
    } catch (e) {
      console.error('Error parsing notes:', e);
      return [];
    }
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
    
    const notes = this.getNotes();
    const existingIndex = notes.findIndex(n => n.id === updatedNote.id);
    
    if (existingIndex >= 0) {
      notes[existingIndex] = { ...notes[existingIndex], ...updatedNote, updatedAt: Date.now() };
    } else {
      notes.unshift({ ...updatedNote, createdAt: Date.now(), updatedAt: Date.now() });
    }
    
    this._persist(notes);
    return updatedNote;
  },

  deleteNote(id) {
    const notes = this.getNotes().filter(n => n.id !== id);
    this._persist(notes);
  },

  createNote() {
    const notes = this.getNotes();
    
    // Check note limit
    if (notes.length >= MAX_NOTES) {
      // Remove oldest notes to make room
      const sortedByDate = [...notes].sort((a, b) => a.updatedAt - b.updatedAt);
      const toRemove = sortedByDate.slice(0, notes.length - MAX_NOTES + 1);
      toRemove.forEach(n => this.deleteNote(n.id));
      console.warn(`Removed ${toRemove.length} old notes to maintain limit`);
    }
    
    const newNote = {
      id: crypto.randomUUID(),
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    const updatedNotes = this.getNotes();
    updatedNotes.unshift(newNote);
    this._persist(updatedNotes);
    return newNote;
  },

  _persist(notes) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }
};
