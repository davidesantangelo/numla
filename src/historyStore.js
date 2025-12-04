/**
 * History Store - Note Version History Management
 * Manages snapshots of note content for the Time Machine feature
 */

const HISTORY_PREFIX = 'numla-history-';
const MAX_SNAPSHOTS = 100;
const MIN_CHANGE_THRESHOLD = 5; // Minimum character change to create snapshot

let historyCache = new Map();

/**
 * Get the storage key for a note's history
 */
function getStorageKey(noteId) {
  return `${HISTORY_PREFIX}${noteId}`;
}

/**
 * Load history for a note from localStorage
 */
function loadHistory(noteId) {
  if (historyCache.has(noteId)) {
    return historyCache.get(noteId);
  }

  const key = getStorageKey(noteId);
  const raw = localStorage.getItem(key);

  if (!raw) {
    const empty = [];
    historyCache.set(noteId, empty);
    return empty;
  }

  try {
    const history = JSON.parse(raw);
    historyCache.set(noteId, history);
    return history;
  } catch (e) {
    console.error('Error parsing history:', e);
    const empty = [];
    historyCache.set(noteId, empty);
    return empty;
  }
}

/**
 * Persist history to localStorage
 */
function persistHistory(noteId, history) {
  const key = getStorageKey(noteId);
  try {
    const payload = JSON.stringify(history);
    localStorage.setItem(key, payload);
    historyCache.set(noteId, history);
  } catch (e) {
    console.error('Failed to persist history:', e);
    // If quota exceeded, prune more aggressively
    if (e.name === 'QuotaExceededError' && history.length > 10) {
      const prunedHistory = history.slice(-Math.floor(history.length / 2));
      persistHistory(noteId, prunedHistory);
    }
  }
}

/**
 * Calculate the difference between two strings (simplified)
 */
function getChangeMagnitude(oldContent, newContent) {
  if (!oldContent) return newContent.length;
  if (!newContent) return oldContent.length;
  
  // Simple character count difference as a basic heuristic
  const lengthDiff = Math.abs(newContent.length - oldContent.length);
  
  // If lengths are similar, check for actual character changes
  if (lengthDiff < MIN_CHANGE_THRESHOLD) {
    let changes = 0;
    const minLen = Math.min(oldContent.length, newContent.length);
    for (let i = 0; i < minLen && changes < MIN_CHANGE_THRESHOLD; i++) {
      if (oldContent[i] !== newContent[i]) changes++;
    }
    return changes + lengthDiff;
  }
  
  return lengthDiff;
}

/**
 * Count words in content
 */
function countWords(content) {
  if (!content) return 0;
  return content.trim().split(/\s+/).filter(w => w.length > 0).length;
}

export const historyStore = {
  /**
   * Save a snapshot of the note content
   * Only saves if there's a meaningful change from the last snapshot
   */
  saveSnapshot(noteId, content) {
    if (!noteId) return false;

    const history = loadHistory(noteId);
    const lastSnapshot = history[history.length - 1];

    // Check if change is significant enough
    if (lastSnapshot) {
      const changeMagnitude = getChangeMagnitude(lastSnapshot.content, content);
      if (changeMagnitude < MIN_CHANGE_THRESHOLD) {
        return false; // Not enough change
      }
    }

    // Create new snapshot
    const snapshot = {
      timestamp: Date.now(),
      content: content,
      wordCount: countWords(content)
    };

    history.push(snapshot);

    // Prune if over limit
    while (history.length > MAX_SNAPSHOTS) {
      history.shift();
    }

    persistHistory(noteId, history);
    return true;
  },

  /**
   * Get all history snapshots for a note
   */
  getHistory(noteId) {
    if (!noteId) return [];
    return loadHistory(noteId).map(s => ({ ...s }));
  },

  /**
   * Get the number of snapshots for a note
   */
  getSnapshotCount(noteId) {
    if (!noteId) return 0;
    return loadHistory(noteId).length;
  },

  /**
   * Get a specific snapshot by index
   * Index 0 is the oldest snapshot
   */
  getSnapshotAt(noteId, index) {
    if (!noteId) return null;
    const history = loadHistory(noteId);
    if (index < 0 || index >= history.length) return null;
    return { ...history[index] };
  },

  /**
   * Get the most recent snapshot
   */
  getLatestSnapshot(noteId) {
    if (!noteId) return null;
    const history = loadHistory(noteId);
    if (history.length === 0) return null;
    return { ...history[history.length - 1] };
  },

  /**
   * Delete all history for a note
   */
  deleteHistory(noteId) {
    if (!noteId) return;
    const key = getStorageKey(noteId);
    localStorage.removeItem(key);
    historyCache.delete(noteId);
  },

  /**
   * Clear the in-memory cache (useful for testing)
   */
  clearCache() {
    historyCache.clear();
  },

  /**
   * Get all note IDs that have history
   */
  getAllNoteIdsWithHistory() {
    const ids = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(HISTORY_PREFIX)) {
        ids.push(key.substring(HISTORY_PREFIX.length));
      }
    }
    return ids;
  }
};
