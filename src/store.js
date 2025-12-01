const STORAGE_KEY = 'numla-notes';

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
    const newNote = {
      id: crypto.randomUUID(),
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    const notes = this.getNotes();
    notes.unshift(newNote);
    this._persist(notes);
    return newNote;
  },

  _persist(notes) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }
};
