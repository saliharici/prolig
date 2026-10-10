import { afterEach, describe, expect, it, vi } from 'vitest';
import { activateNavigationDrawer } from '../src/navigation/drawer';

afterEach(() => vi.unstubAllGlobals());

function setup() {
  const listeners = new Map<string, (event: any) => void>();
  const body = { style: { overflow: 'auto', position: '', top: '', width: '' } };
  const doc: any = {
    body,
    activeElement: null,
    addEventListener: vi.fn((name: string, handler: (event: any) => void) => listeners.set(name, handler)),
    removeEventListener: vi.fn((name: string) => listeners.delete(name)),
  };
  const win = { scrollY: 320, scrollTo: vi.fn() };
  vi.stubGlobal('document', doc);
  vi.stubGlobal('window', win);
  const element = () => {
    const node: any = {
      tabIndex: 0,
      isConnected: true,
      closest: vi.fn().mockReturnValue(null),
      matches: vi.fn().mockReturnValue(false),
      getClientRects: vi.fn().mockReturnValue([{}]),
      focus: vi.fn(() => { doc.activeElement = node; }),
    };
    return node;
  };
  const trigger = element();
  const close = element();
  const firstLink = element();
  const lastLink = element();
  const hidden = element();
  hidden.getClientRects.mockReturnValue([]);
  const disabledTabStop = element();
  disabledTabStop.tabIndex = -1;
  const disabledButton = element();
  disabledButton.matches.mockReturnValue(true);
  const panel: any = element();
  panel.querySelectorAll = vi.fn(() => [close, firstLink, hidden, disabledTabStop, lastLink, disabledButton]);
  panel.querySelector = vi.fn(() => firstLink);
  panel.contains = (node: any) => [panel, close, firstLink, lastLink].includes(node);
  doc.activeElement = trigger;
  const onClose = vi.fn();
  const cleanup = activateNavigationDrawer(panel, trigger, onClose);
  const key = (value: string, shiftKey = false) => {
    const event = { key: value, shiftKey, preventDefault: vi.fn(), stopPropagation: vi.fn() };
    listeners.get('keydown')?.(event);
    return event;
  };
  return { body, doc, win, panel, trigger, close, firstLink, lastLink, onClose, cleanup, key, listeners };
}

describe('mobile navigation drawer', () => {
  it('focuses the close control and locks background scrolling without losing the scroll position', () => {
    const { doc, close, body, cleanup, win } = setup();
    expect(doc.activeElement).toBe(close);
    expect(body.style).toMatchObject({ overflow: 'hidden', position: 'fixed', top: '-320px', width: '100%' });
    cleanup();
    expect(body.style).toEqual({ overflow: 'auto', position: '', top: '', width: '' });
    expect(win.scrollTo).toHaveBeenCalledWith(0, 320);
  });

  it('wraps Tab at the final visible control and Shift+Tab at the first', () => {
    const { doc, close, lastLink, key } = setup();
    doc.activeElement = lastLink;
    expect(key('Tab').preventDefault).toHaveBeenCalled();
    expect(doc.activeElement).toBe(close);
    expect(key('Tab', true).preventDefault).toHaveBeenCalled();
    expect(doc.activeElement).toBe(lastLink);
  });

  it('allows ordinary Tab navigation between controls', () => {
    const { doc, firstLink, key } = setup();
    doc.activeElement = firstLink;
    expect(key('Tab').preventDefault).not.toHaveBeenCalled();
  });

  it('closes with Escape while leaving other keys alone', () => {
    const { onClose, key } = setup();
    key('Enter');
    expect(onClose).not.toHaveBeenCalled();
    const escape = key('Escape');
    expect(onClose).toHaveBeenCalledOnce();
    expect(escape.preventDefault).toHaveBeenCalled();
    expect(escape.stopPropagation).toHaveBeenCalled();
  });

  it('redirects focus back into the drawer if it escapes', () => {
    const { doc, trigger, close, listeners } = setup();
    doc.activeElement = trigger;
    listeners.get('focusin')?.({ target: trigger });
    expect(doc.activeElement).toBe(close);
  });

  it('restores focus and removes event listeners on close', () => {
    const { doc, trigger, cleanup, listeners } = setup();
    cleanup();
    expect(doc.activeElement).toBe(trigger);
    expect(listeners.size).toBe(0);
  });

  it('keeps focus on the panel if there are no visible controls', () => {
    const { doc, panel, key } = setup();
    panel.querySelectorAll.mockReturnValue([]);
    expect(key('Tab').preventDefault).toHaveBeenCalled();
    expect(doc.activeElement).toBe(panel);
  });

  it('restores focus to the active desktop item when a resize hides the mobile trigger', () => {
    const { doc, trigger, firstLink, cleanup } = setup();
    trigger.getClientRects.mockReturnValue([]);
    cleanup();
    expect(doc.activeElement).toBe(firstLink);
  });
});
