/**
 * Time Machine - Note History Navigation
 * Visual interface for navigating through note version history
 */

import { historyStore } from './historyStore.js';

let isOpen = false;
let currentNoteId = null;
let currentIndex = -1;
let snapshots = [];
let originalContent = null;
let onRestoreCallback = null;
let onCloseCallback = null;

// DOM element references
let elements = {
  panel: null,
  overlay: null,
  slider: null,
  versionLabel: null,
  dateLabel: null,
  timeLabel: null,
  relativeLabel: null,
  wordCountLabel: null,
  currentLabel: null,
  previewArea: null,
  restoreBtn: null,
  closeBtn: null
};

/**
 * Format timestamp into separate date, time, and relative components
 */
function formatTimestampParts(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  // Date: "Dec 4, 2025"
  const dateStr = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  // Time: "14:30:45"
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  // Relative: "2 hours ago"
  let relativeStr;
  if (diffMins < 1) {
    relativeStr = 'Just now';
  } else if (diffMins < 60) {
    relativeStr = `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    relativeStr = `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    relativeStr = `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    relativeStr = `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
  } else {
    const months = Math.floor(diffDays / 30);
    relativeStr = `${months} month${months !== 1 ? 's' : ''} ago`;
  }

  return { dateStr, timeStr, relativeStr };
}

/**
 * Update the UI with current snapshot info
 */
function updateSliderUI() {
  if (!elements.slider || snapshots.length === 0) return;

  const total = snapshots.length;
  const position = currentIndex + 1;
  const snapshot = snapshots[currentIndex];
  const isLatest = currentIndex === total - 1;
  
  // Update slider
  elements.slider.max = total - 1;
  elements.slider.value = currentIndex;
  
  // Update version label
  if (elements.versionLabel) {
    elements.versionLabel.textContent = `Version ${position} of ${total}`;
  }
  
  // Update date, time, and relative labels
  if (snapshot) {
    const { dateStr, timeStr, relativeStr } = formatTimestampParts(snapshot.timestamp);
    
    if (elements.dateLabel) {
      elements.dateLabel.textContent = dateStr;
    }
    if (elements.timeLabel) {
      elements.timeLabel.textContent = timeStr;
    }
    if (elements.relativeLabel) {
      elements.relativeLabel.textContent = relativeStr;
    }
  }
  
  // Update word count
  if (elements.wordCountLabel && snapshot) {
    const wc = snapshot.wordCount;
    elements.wordCountLabel.textContent = `${wc} word${wc !== 1 ? 's' : ''}`;
  }

  // Update preview content
  if (elements.previewArea && snapshot) {
    elements.previewArea.textContent = snapshot.content || '(empty)';
  }

  // Update slider track gradient for visual progress
  if (elements.slider) {
    const percent = total > 1 ? (currentIndex / (total - 1)) * 100 : 100;
    elements.slider.style.setProperty('--progress', `${percent}%`);
  }

  // Show/hide current version label
  if (elements.currentLabel) {
    elements.currentLabel.classList.toggle('hidden', !isLatest);
  }

  // Disable restore button if at latest version
  if (elements.restoreBtn) {
    elements.restoreBtn.disabled = isLatest;
  }
}

/**
 * Preview a snapshot
 */
function previewSnapshot(index) {
  if (index < 0 || index >= snapshots.length) return;
  
  currentIndex = index;
  updateSliderUI();
}

/**
 * Hide the Time Machine panel with animation
 */
function hidePanel() {
  if (elements.overlay) {
    elements.overlay.classList.add('opacity-0');
    setTimeout(() => elements.overlay.classList.add('hidden'), 300);
  }
  
  if (elements.panel) {
    elements.panel.classList.add('opacity-0');
    setTimeout(() => elements.panel.classList.add('hidden'), 300);
  }

  document.body.classList.remove('time-machine-active');
}

/**
 * Reset internal state
 */
function resetState() {
  currentNoteId = null;
  currentIndex = -1;
  snapshots = [];
  originalContent = null;
}

export const timeMachine = {
  /**
   * Initialize Time Machine with DOM element references
   */
  init() {
    elements.panel = document.getElementById('time-machine-panel');
    elements.overlay = document.getElementById('time-machine-overlay');
    elements.slider = document.getElementById('time-machine-slider');
    elements.versionLabel = document.getElementById('time-machine-version');
    elements.dateLabel = document.getElementById('time-machine-date');
    elements.timeLabel = document.getElementById('time-machine-time');
    elements.relativeLabel = document.getElementById('time-machine-relative');
    elements.wordCountLabel = document.getElementById('time-machine-wordcount');
    elements.currentLabel = document.getElementById('time-machine-current-label');
    elements.previewArea = document.getElementById('time-machine-preview');
    elements.restoreBtn = document.getElementById('time-machine-restore-btn');
    elements.closeBtn = document.getElementById('time-machine-close-btn');

    // Set up event listeners
    if (elements.slider) {
      elements.slider.addEventListener('input', (e) => {
        const index = parseInt(e.target.value, 10);
        previewSnapshot(index);
      });
    }

    if (elements.restoreBtn) {
      elements.restoreBtn.addEventListener('click', () => {
        this.restore();
      });
    }

    if (elements.closeBtn) {
      elements.closeBtn.addEventListener('click', () => {
        this.close();
      });
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (!isOpen) return;
      
      if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        e.preventDefault();
        previewSnapshot(currentIndex - 1);
      } else if (e.key === 'ArrowRight' && currentIndex < snapshots.length - 1) {
        e.preventDefault();
        previewSnapshot(currentIndex + 1);
      } else if (e.key === 'Enter' && !elements.restoreBtn?.disabled) {
        e.preventDefault();
        this.restore();
      }
    });
  },

  /**
   * Set callbacks for restore and close actions
   */
  setCallbacks(onRestore, onClose) {
    onRestoreCallback = onRestore;
    onCloseCallback = onClose;
  },

  /**
   * Open Time Machine for a specific note
   */
  open(noteId, currentContent) {
    if (!noteId) return false;

    currentNoteId = noteId;
    originalContent = currentContent;
    snapshots = historyStore.getHistory(noteId);

    // Add current state as the latest "snapshot" if different from last saved
    const lastSnapshot = snapshots[snapshots.length - 1];
    if (!lastSnapshot || lastSnapshot.content !== currentContent) {
      snapshots.push({
        timestamp: Date.now(),
        content: currentContent,
        wordCount: currentContent.trim().split(/\s+/).filter(w => w.length > 0).length,
        isCurrent: true
      });
    }

    if (snapshots.length === 0) {
      return false;
    }

    currentIndex = snapshots.length - 1; // Start at latest
    isOpen = true;

    // Show the panel
    if (elements.overlay) {
      elements.overlay.classList.remove('hidden', 'opacity-0');
    }
    
    if (elements.panel) {
      elements.panel.classList.remove('hidden', 'opacity-0');
    }

    // Add body class for styling
    document.body.classList.add('time-machine-active');

    updateSliderUI();
    return true;
  },

  /**
   * Close Time Machine without restoring
   */
  close() {
    if (!isOpen) return;

    isOpen = false;

    // Restore original content
    window.dispatchEvent(new CustomEvent('timemachine:close', {
      detail: { content: originalContent }
    }));

    hidePanel();
    resetState();

    if (onCloseCallback) {
      onCloseCallback();
    }
  },

  /**
   * Restore the currently selected snapshot
   */
  restore() {
    if (!isOpen || currentIndex < 0 || currentIndex >= snapshots.length) return;

    const snapshot = snapshots[currentIndex];
    
    // Dispatch restore event
    window.dispatchEvent(new CustomEvent('timemachine:restore', {
      detail: {
        noteId: currentNoteId,
        content: snapshot.content,
        timestamp: snapshot.timestamp
      }
    }));

    if (onRestoreCallback) {
      onRestoreCallback(currentNoteId, snapshot.content);
    }

    // Close the panel
    isOpen = false;
    hidePanel();
    resetState();
  },

  /**
   * Navigate to a specific snapshot index
   */
  navigateTo(index) {
    if (!isOpen) return;
    previewSnapshot(index);
  },

  /**
   * Check if Time Machine is currently open
   */
  isOpen() {
    return isOpen;
  },

  /**
   * Get the current note ID being viewed
   */
  getCurrentNoteId() {
    return currentNoteId;
  },

  /**
   * Check if a note has any history
   */
  hasHistory(noteId) {
    return historyStore.getSnapshotCount(noteId) > 0;
  }
};
