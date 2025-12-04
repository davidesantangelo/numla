import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const TOUR_COMPLETED_KEY = 'numla-tour-completed';

export function initTour() {
  // Check if tour has already been completed
  const tourCompleted = localStorage.getItem(TOUR_COMPLETED_KEY);
  if (tourCompleted) {
    return;
  }

  // Wait a bit for the UI to fully render
  setTimeout(() => {
    startTour();
  }, 500);
}

export function startTour() {
  const isMobile = window.innerWidth < 768;

  const isDark = document.documentElement.classList.contains('dark');
  
  const driverObj = driver({
    showProgress: true,
    animate: true,
    allowClose: true,
    overlayColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.5)',
    stagePadding: 15,
    stageRadius: 10,
    popoverClass: 'numla-tour-popover',
    progressText: '{{current}} of {{total}}',
    nextBtnText: 'Next',
    prevBtnText: 'Back',
    doneBtnText: 'Get Started!',
    onDestroyStarted: () => {
      // Mark tour as completed when user closes or finishes
      localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
      driverObj.destroy();
    },
    steps: isMobile ? getMobileSteps() : getDesktopSteps()
  });

  driverObj.drive();
}

function getDesktopSteps() {
  return [
    {
      element: '#note-editor',
      popover: {
        title: 'Calculation Editor',
        description: 'Type your math expressions here. Numla will automatically calculate results in real-time.',
        side: 'left',
        align: 'center'
      }
    },
    {
      element: '#results-display',
      popover: {
        title: 'Results',
        description: 'Your expression results will appear here. Click on any result to copy it to clipboard!',
        side: 'left',
        align: 'center'
      }
    },
    {
      element: '#command-bar',
      popover: {
        title: 'Command Bar',
        description: 'Use these buttons to quickly insert operators and functions: percentage, power, square root, sum, average, currencies, and π.',
        side: 'top',
        align: 'center'
      }
    },
    {
      element: '#tab-bar',
      popover: {
        title: 'Note Tabs',
        description: 'Manage multiple notes at once with tabs. Press ⌘J to create a new note.',
        side: 'bottom',
        align: 'center'
      }
    },
    {
      element: '#tab-manager-btn',
      popover: {
        title: 'Notes Manager',
        description: 'Click here to see all your notes, search, and delete them.',
        side: 'bottom',
        align: 'start'
      }
    },
    {
      element: '#theme-toggle-btn',
      popover: {
        title: 'Light/Dark Theme',
        description: 'Switch between light and dark theme according to your preference.',
        side: 'bottom',
        align: 'center'
      }
    },
    {
      element: '#focus-mode-btn',
      popover: {
        title: 'Focus Mode',
        description: 'Enable focus mode for a distraction-free writing experience. Press ESC to exit.',
        side: 'bottom',
        align: 'center'
      }
    },
    {
      element: '#time-machine-btn',
      popover: {
        title: 'Time Machine',
        description: 'Travel back in time! Browse through your note\'s history and restore any previous version. Press ⌘E to open.',
        side: 'bottom',
        align: 'center'
      }
    },
    {
      element: '#export-btn',
      popover: {
        title: 'Export',
        description: 'Download the current note as a text file.',
        side: 'bottom',
        align: 'center'
      }
    },
    {
      popover: {
        title: 'Keyboard Shortcuts',
        description: `
          <div style="text-align: left; font-size: 13px; line-height: 1.6;">
            <p><kbd style="background: rgba(0,0,0,0.1); padding: 2px 6px; border-radius: 4px;">⌘K</kbd> Search notes</p>
            <p><kbd style="background: rgba(0,0,0,0.1); padding: 2px 6px; border-radius: 4px;">⌘J</kbd> New note</p>
            <p><kbd style="background: rgba(0,0,0,0.1); padding: 2px 6px; border-radius: 4px;">⌘E</kbd> Time Machine</p>
            <p><kbd style="background: rgba(0,0,0,0.1); padding: 2px 6px; border-radius: 4px;">ESC</kbd> Exit focus mode</p>
          </div>
        `,
        side: 'center',
        align: 'center'
      }
    },
    {
      popover: {
        title: 'Calculation Examples',
        description: `
          <div style="text-align: left; font-size: 14px; line-height: 1.8; font-family: monospace;">
            <p><code>100 + 50</code> → Basic operations</p>
            <p><code>20% of 150</code> → Percentages</p>
            <p><code>$100 in EUR</code> → Currency conversion</p>
            <p><code>tax = 22%</code> → Variables</p>
            <p><code>sum</code> / <code>avg</code> → Sum/Average</p>
            <p><code># comment</code> → Comments</p>
          </div>
        `,
        side: 'center',
        align: 'center'
      }
    },
    {
      popover: {
        title: 'Ready to Start!',
        description: 'Numla is ready. Start typing your math expressions and watch the magic!',
        side: 'center',
        align: 'center'
      }
    }
  ];
}

function getMobileSteps() {
  return [
    {
      element: '#note-editor',
      popover: {
        title: 'Calculation Editor',
        description: 'Type your math expressions here. Results will appear on the right.',
        side: 'top',
        align: 'center'
      }
    },
    {
      element: '#results-display',
      popover: {
        title: 'Results',
        description: 'Tap on a result to copy it to clipboard!',
        side: 'left',
        align: 'center'
      }
    },
    {
      element: '#menu-btn',
      popover: {
        title: 'Notes Menu',
        description: 'Tap here to see all your notes, create new ones, or search.',
        side: 'bottom',
        align: 'start'
      }
    },
    {
      element: '#mobile-bottom-bar',
      popover: {
        title: 'Toolbar',
        description: 'Export, delete, change theme, focus mode, or open Time Machine to restore previous versions.',
        side: 'top',
        align: 'center'
      }
    },
    {
      element: '#time-machine-btn-mobile',
      popover: {
        title: 'Time Machine',
        description: 'Tap to browse your note\'s history and restore any previous version.',
        side: 'top',
        align: 'center'
      }
    },
    {
      popover: {
        title: 'Calculation Examples',
        description: `
          <div style="text-align: left; font-size: 14px; line-height: 1.8; font-family: monospace;">
            <p><code>100 + 50</code> → Basic operations</p>
            <p><code>20% of 150</code> → Percentages</p>
            <p><code>$100 in EUR</code> → Currency conversion</p>
            <p><code>tax = 22%</code> → Variables</p>
          </div>
        `,
        side: 'center',
        align: 'center'
      }
    },
    {
      popover: {
        title: 'Ready!',
        description: 'Start typing your math expressions!',
        side: 'center',
        align: 'center'
      }
    }
  ];
}

// Export function to manually restart the tour
export function resetTour() {
  localStorage.removeItem(TOUR_COMPLETED_KEY);
}
