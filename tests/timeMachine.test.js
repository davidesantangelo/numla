/**
 * Time Machine UI tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';

let timeMachine;
let historyStoreMock;

const baseHistory = [
  { timestamp: 1_000, content: 'old snapshot', wordCount: 2 }
];

function buildDom() {
  const dom = new JSDOM(`<!DOCTYPE html><body>
    <div id="time-machine-overlay" class="hidden opacity-0"></div>
    <div id="time-machine-panel" class="hidden opacity-0"></div>
    <input id="time-machine-slider" type="range" />
    <div id="time-machine-version"></div>
    <div id="time-machine-date"></div>
    <div id="time-machine-time"></div>
    <div id="time-machine-relative"></div>
    <div id="time-machine-wordcount"></div>
    <div id="time-machine-current-label"></div>
    <pre id="time-machine-preview"></pre>
    <button id="time-machine-restore-btn"></button>
    <button id="time-machine-close-btn"></button>
  </body>`);
  global.window = dom.window;
  global.document = dom.window.document;
  global.CustomEvent = dom.window.CustomEvent;
}

async function loadModule() {
  vi.resetModules();
  buildDom();

  historyStoreMock = {
    getHistory: vi.fn(() => baseHistory.map(s => ({ ...s }))),
    getSnapshotCount: vi.fn(() => baseHistory.length)
  };

  vi.doMock('../src/historyStore.js', () => ({ historyStore: historyStoreMock }));
  const mod = await import('../src/timeMachine.js');
  timeMachine = mod.timeMachine;
  timeMachine.init();
}

describe('Time Machine', () => {
  beforeEach(async () => {
    await loadModule();
  });

  it('opens with history and appends current snapshot', () => {
    const opened = timeMachine.open('note-1', 'current note');

    expect(opened).toBe(true);
    expect(timeMachine.isOpen()).toBe(true);
    expect(historyStoreMock.getHistory).toHaveBeenCalledWith('note-1');

    const slider = document.getElementById('time-machine-slider');
    expect(Number(slider.max)).toBe(1); // base snapshot + current snapshot
    expect(Number(slider.value)).toBe(1);

    const preview = document.getElementById('time-machine-preview');
    expect(preview.textContent).toBe('current note');
    expect(document.body.classList.contains('time-machine-active')).toBe(true);
  });

  it('restores the selected snapshot and emits events', () => {
    const onRestore = vi.fn();
    const onClose = vi.fn();
    timeMachine.setCallbacks(onRestore, onClose);

    let restoreDetail;
    window.addEventListener('timemachine:restore', (e) => {
      restoreDetail = e.detail;
    });

    timeMachine.open('note-1', 'current note');
    timeMachine.restore();

    expect(onRestore).toHaveBeenCalledWith('note-1', 'current note');
    expect(restoreDetail).toMatchObject({ noteId: 'note-1', content: 'current note' });
    expect(timeMachine.isOpen()).toBe(false);
  });

  it('closes without restore and emits close event', () => {
    const onRestore = vi.fn();
    const onClose = vi.fn();
    timeMachine.setCallbacks(onRestore, onClose);

    let closeDetail;
    window.addEventListener('timemachine:close', (e) => {
      closeDetail = e.detail;
    });

    timeMachine.open('note-1', 'current note');
    timeMachine.close();

    expect(onRestore).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
    expect(closeDetail).toMatchObject({ content: 'current note' });
    expect(document.body.classList.contains('time-machine-active')).toBe(false);
  });
});
