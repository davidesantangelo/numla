/**
 * Store Test Suite
 * Tests for localStorage-based note storage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: vi.fn((key) => store[key] || null),
        setItem: vi.fn((key, value) => {
            store[key] = value.toString();
        }),
        removeItem: vi.fn((key) => {
            delete store[key];
        }),
        clear: vi.fn(() => {
            store = {};
        }),
        get _store() {
            return store;
        }
    };
})();

Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
    writable: true
});

// Mock crypto.randomUUID
vi.stubGlobal('crypto', {
    randomUUID: vi.fn(() => 'test-uuid-' + Math.random().toString(36).substring(7))
});

// Import store after mocks are set up
const { store } = await import('../src/store.js');

describe('Store', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
    });

    describe('getNotes', () => {
        it('should return empty array when no notes exist', () => {
            const notes = store.getNotes();
            expect(notes).toEqual([]);
        });

        it('should return parsed notes from localStorage', () => {
            const mockNotes = [
                { id: '1', content: 'Test', createdAt: Date.now(), updatedAt: Date.now() }
            ];
            localStorageMock.setItem('numla-notes', JSON.stringify(mockNotes));
            
            const notes = store.getNotes();
            expect(notes).toHaveLength(1);
            expect(notes[0].content).toBe('Test');
        });

        it('should filter out invalid notes', () => {
            const mockNotes = [
                { id: '1', content: 'Valid', createdAt: Date.now(), updatedAt: Date.now() },
                { content: 'Missing id' },
                null,
                { id: '2' } // Missing content and dates
            ];
            localStorageMock.setItem('numla-notes', JSON.stringify(mockNotes));
            
            const notes = store.getNotes();
            expect(notes).toHaveLength(1);
            expect(notes[0].id).toBe('1');
        });

        it('should handle corrupted JSON gracefully', () => {
            localStorageMock.setItem('numla-notes', 'invalid json {{{');
            
            const notes = store.getNotes();
            expect(notes).toEqual([]);
        });
    });

    describe('createNote', () => {
        it('should create a new note with proper structure', () => {
            const note = store.createNote();
            
            expect(note).toHaveProperty('id');
            expect(note).toHaveProperty('content', '');
            expect(note).toHaveProperty('createdAt');
            expect(note).toHaveProperty('updatedAt');
        });

        it('should add the note to storage', () => {
            store.createNote();
            const notes = store.getNotes();
            
            expect(notes).toHaveLength(1);
        });

        it('should add new notes at the beginning', () => {
            const first = store.createNote();
            const second = store.createNote();
            const notes = store.getNotes();
            
            expect(notes[0].id).toBe(second.id);
        });
    });

    describe('saveNote', () => {
        it('should update an existing note', () => {
            const note = store.createNote();
            const updatedNote = { ...note, content: 'Updated content' };
            
            store.saveNote(updatedNote);
            const notes = store.getNotes();
            
            expect(notes[0].content).toBe('Updated content');
        });

        it('should update the updatedAt timestamp', async () => {
            const note = store.createNote();
            const originalTime = note.updatedAt;
            
            // Small delay to ensure time difference
            await new Promise(resolve => setTimeout(resolve, 10));
            
            store.saveNote({ ...note, content: 'New content' });
            const notes = store.getNotes();
            
            expect(notes[0].updatedAt).toBeGreaterThanOrEqual(originalTime);
        });

        it('should return null for invalid note', () => {
            const result = store.saveNote(null);
            expect(result).toBeNull();
        });

        it('should return null for note without id', () => {
            const result = store.saveNote({ content: 'No ID' });
            expect(result).toBeNull();
        });

        it('should truncate very large content', () => {
            const note = store.createNote();
            const largeContent = 'x'.repeat(600000); // Over 500KB
            
            store.saveNote({ ...note, content: largeContent });
            const notes = store.getNotes();
            
            expect(notes[0].content.length).toBeLessThanOrEqual(500000);
        });
    });

    describe('deleteNote', () => {
        it('should remove a note from storage', () => {
            const note = store.createNote();
            
            store.deleteNote(note.id);
            const notes = store.getNotes();
            
            expect(notes).toHaveLength(0);
        });

        it('should not affect other notes', () => {
            const first = store.createNote();
            const second = store.createNote();
            
            store.deleteNote(first.id);
            const notes = store.getNotes();
            
            expect(notes).toHaveLength(1);
            expect(notes[0].id).toBe(second.id);
        });

        it('should handle non-existent note gracefully', () => {
            store.createNote();
            
            expect(() => store.deleteNote('non-existent-id')).not.toThrow();
        });
    });
});
