import {
  isPreventable,
  KEY_HISTORY_LIMIT,
  locationName,
  serializeKeyEvent,
  type KeyEventLike,
} from '@/lib/keycode-inspector';

function makeEvent(overrides: Partial<KeyEventLike> = {}): KeyEventLike {
  return {
    key: 'a',
    code: 'KeyA',
    keyCode: 65,
    which: 65,
    location: 0,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    repeat: false,
    ...overrides,
  };
}

describe('serializeKeyEvent', () => {
  it('extracts all inspected fields into a plain object', () => {
    const e = makeEvent({
      key: 'Enter',
      code: 'NumpadEnter',
      keyCode: 13,
      which: 13,
      location: 3,
      shiftKey: true,
    });
    expect(serializeKeyEvent(e)).toEqual({
      key: 'Enter',
      code: 'NumpadEnter',
      keyCode: 13,
      which: 13,
      location: 3,
      ctrlKey: false,
      shiftKey: true,
      altKey: false,
      metaKey: false,
      repeat: false,
    });
  });

  it('defaults repeat to false when absent', () => {
    const e = makeEvent();
    delete e.repeat;
    expect(serializeKeyEvent(e).repeat).toBe(false);
  });

  it('produces JSON-serializable output', () => {
    const serialized = serializeKeyEvent(makeEvent({ key: '"', code: 'Quote' }));
    expect(JSON.parse(JSON.stringify(serialized))).toEqual(serialized);
  });
});

describe('locationName', () => {
  it('maps the four DOM_KEY_LOCATION constants', () => {
    expect(locationName(0)).toBe('standard');
    expect(locationName(1)).toBe('left');
    expect(locationName(2)).toBe('right');
    expect(locationName(3)).toBe('numpad');
  });

  it('returns unknown for anything else', () => {
    expect(locationName(4)).toBe('unknown');
    expect(locationName(-1)).toBe('unknown');
    expect(locationName(NaN)).toBe('unknown');
  });
});

describe('isPreventable', () => {
  it('is true for keys that would scroll or navigate', () => {
    for (const key of [' ', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End', "'", '"', '/']) {
      expect(isPreventable(makeEvent({ key }))).toBe(true);
    }
  });

  it('is false for ordinary keys', () => {
    for (const key of ['a', 'Z', '1', 'Enter', 'Escape', 'F5', 'Shift', 'Backspace']) {
      expect(isPreventable(makeEvent({ key }))).toBe(false);
    }
  });

  it('is false whenever Ctrl or Meta is held (browser shortcuts must work)', () => {
    expect(isPreventable(makeEvent({ key: ' ', ctrlKey: true }))).toBe(false);
    expect(isPreventable(makeEvent({ key: 'Tab', ctrlKey: true }))).toBe(false);
    expect(isPreventable(makeEvent({ key: 'ArrowLeft', metaKey: true }))).toBe(false);
    expect(isPreventable(makeEvent({ key: 'r', metaKey: true }))).toBe(false);
    expect(isPreventable(makeEvent({ key: 'r', ctrlKey: true }))).toBe(false);
  });

  it('stays true with Shift or Alt alone', () => {
    expect(isPreventable(makeEvent({ key: 'Tab', shiftKey: true }))).toBe(true);
    expect(isPreventable(makeEvent({ key: ' ', altKey: true }))).toBe(true);
  });
});

describe('KEY_HISTORY_LIMIT', () => {
  it('is a small positive number', () => {
    expect(KEY_HISTORY_LIMIT).toBe(10);
  });
});
