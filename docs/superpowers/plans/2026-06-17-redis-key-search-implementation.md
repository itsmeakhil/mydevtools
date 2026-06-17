# Redis Commander: Smart Key Search Implementation Plan

> **For agentic workers:** RECOMMENDED: Use superpowers:subagent-driven-development to execute this plan task-by-task with review checkpoints between tasks. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add intelligent live search/filtering to Redis Commander's key browser with glob, regex, and fuzzy matching modes.

**Architecture:** Client-side search pipeline with pattern detection (glob → regex → fuzzy), 300ms debounced input, filtered key display, and optional mode override panel. All matching on already-loaded keys, no server calls.

**Tech Stack:** React (hooks), TypeScript, Tailwind CSS, `lucide-react` icons

## Global Constraints

- Target: thousands of keys (no server pagination required for Phase 1a/1b)
- Debounce: 300ms
- Regex error handling: fall back to fuzzy, show error inline
- Highlight colors: fuzzy chars `bg-yellow-200/50`, glob/regex segments `bg-blue-200/50`
- Search persists while tab open, clears on tab close/connection switch
- Keyboard: Escape clears search, Enter is no-op

---

## File Structure

### New Files
- `src/components/redis-commander/search-utils.ts` — Matching algorithms + type detection
- `src/components/redis-commander/search-bar.tsx` — Input + mode icon + clear button
- `src/components/redis-commander/advanced-search-panel.tsx` — Mode toggles + reset button

### Modified Files
- `src/components/redis-commander/types.ts` — Add SearchMode type
- `src/components/redis-commander/key-browser.tsx` — Integrate SearchBar, wire up state, filter keys
- `src/components/redis-commander/key-item.tsx` (or similar) — Add match highlighting to key display (if exists; otherwise add to key-browser inline)

---

## Tasks

### Task 1: Create search-utils.ts with matching algorithms

**Files:**
- Create: `src/components/redis-commander/search-utils.ts`
- Test: `src/components/redis-commander/__tests__/search-utils.test.ts`

**Interfaces:**
- Produces: `detectSearchMode(input: string): 'glob' | 'regex' | 'fuzzy'`
- Produces: `globMatch(keys: string[], pattern: string): string[]`
- Produces: `regexMatch(keys: string[], pattern: string): {keys: string[], error?: string}`
- Produces: `fuzzyMatch(keys: string[], pattern: string): string[]`
- Produces: `getMatchIndices(key: string, pattern: string, mode: 'glob' | 'regex' | 'fuzzy'): number[]` (for highlighting)

**Steps:**

- [ ] **Step 1: Write failing tests for globMatch**

Create `src/components/redis-commander/__tests__/search-utils.test.ts`:

```typescript
import { globMatch, regexMatch, fuzzyMatch, detectSearchMode, getMatchIndices } from '../search-utils';

describe('globMatch', () => {
  it('matches glob pattern with *', () => {
    const keys = ['user:123', 'user:456', 'session:789'];
    const result = globMatch(keys, 'user:*');
    expect(result).toEqual(['user:123', 'user:456']);
  });

  it('matches glob pattern with ?', () => {
    const keys = ['user:1', 'user:12', 'session:1'];
    const result = globMatch(keys, 'user:?');
    expect(result).toEqual(['user:1']);
  });

  it('returns empty array for no matches', () => {
    const keys = ['user:123', 'user:456'];
    const result = globMatch(keys, 'session:*');
    expect(result).toEqual([]);
  });

  it('escapes special regex chars in pattern', () => {
    const keys = ['user.name', 'username', 'user_name'];
    const result = globMatch(keys, 'user.name');
    expect(result).toEqual(['user.name']);
  });
});
```

Run: `npm test -- search-utils.test.ts -t globMatch`  
Expected: FAIL (function not defined)

- [ ] **Step 2: Write failing tests for regexMatch**

Add to `src/components/redis-commander/__tests__/search-utils.test.ts`:

```typescript
describe('regexMatch', () => {
  it('matches valid regex pattern', () => {
    const keys = ['session:123', 'session:456', 'user:123'];
    const result = regexMatch(keys, '^session:[0-9]+$');
    expect(result.keys).toEqual(['session:123', 'session:456']);
    expect(result.error).toBeUndefined();
  });

  it('returns error for invalid regex', () => {
    const keys = ['session:123'];
    const result = regexMatch(keys, '^session[');
    expect(result.keys).toEqual([]);
    expect(result.error).toBeDefined();
  });

  it('matches case-sensitive by default', () => {
    const keys = ['Session:123', 'session:123'];
    const result = regexMatch(keys, '^session:');
    expect(result.keys).toEqual(['session:123']);
  });
});
```

Run: `npm test -- search-utils.test.ts -t regexMatch`  
Expected: FAIL

- [ ] **Step 3: Write failing tests for fuzzyMatch**

Add to `src/components/redis-commander/__tests__/search-utils.test.ts`:

```typescript
describe('fuzzyMatch', () => {
  it('matches fuzzy pattern case-insensitive', () => {
    const keys = ['user_profile', 'user_settings', 'user_data', 'session_data'];
    const result = fuzzyMatch(keys, 'user');
    expect(result).toContain('user_profile');
    expect(result).toContain('user_settings');
    expect(result).not.toContain('session_data');
  });

  it('requires characters in order', () => {
    const keys = ['user_profile', 'profile_user'];
    const result = fuzzyMatch(keys, 'user_pro');
    expect(result).toEqual(['user_profile']);
  });

  it('matches single character', () => {
    const keys = ['user_1', 'admin_1', 'guest_1'];
    const result = fuzzyMatch(keys, 'u');
    expect(result).toContain('user_1');
    expect(result).not.toContain('admin_1');
  });

  it('returns empty for no match', () => {
    const keys = ['user:123', 'session:456'];
    const result = fuzzyMatch(keys, 'xyz');
    expect(result).toEqual([]);
  });
});
```

Run: `npm test -- search-utils.test.ts -t fuzzyMatch`  
Expected: FAIL

- [ ] **Step 4: Write failing tests for detectSearchMode**

Add to `src/components/redis-commander/__tests__/search-utils.test.ts`:

```typescript
describe('detectSearchMode', () => {
  it('detects glob pattern with *', () => {
    expect(detectSearchMode('user:*')).toBe('glob');
  });

  it('detects glob pattern with ?', () => {
    expect(detectSearchMode('user:?')).toBe('glob');
  });

  it('detects regex pattern', () => {
    expect(detectSearchMode('^user:[0-9]+$')).toBe('regex');
  });

  it('detects regex with various special chars', () => {
    expect(detectSearchMode('user[0-9]')).toBe('regex');
    expect(detectSearchMode('(user|admin)')).toBe('regex');
    expect(detectSearchMode('user{2,5}')).toBe('regex');
  });

  it('defaults to fuzzy for normal text', () => {
    expect(detectSearchMode('userprofile')).toBe('fuzzy');
  });

  it('prioritizes glob over regex', () => {
    expect(detectSearchMode('user:*[0-9]')).toBe('glob');
  });
});
```

Run: `npm test -- search-utils.test.ts -t detectSearchMode`  
Expected: FAIL

- [ ] **Step 5: Write failing tests for getMatchIndices**

Add to `src/components/redis-commander/__tests__/search-utils.test.ts`:

```typescript
describe('getMatchIndices', () => {
  it('returns char indices for fuzzy match', () => {
    const indices = getMatchIndices('user_profile', 'usr', 'fuzzy');
    expect(indices).toContain(0); // 'u'
    expect(indices).toContain(1); // 's'
    expect(indices).toContain(2); // 'e'
  });

  it('returns segment range for glob match', () => {
    const indices = getMatchIndices('user:123', 'user:*', 'glob');
    // Should highlight the matched part up to the *
    expect(indices.length).toBeGreaterThan(0);
  });

  it('returns segment range for regex match', () => {
    const indices = getMatchIndices('session:123', '^session:[0-9]+$', 'regex');
    expect(indices.length).toBeGreaterThan(0);
  });
});
```

Run: `npm test -- search-utils.test.ts -t getMatchIndices`  
Expected: FAIL

- [ ] **Step 6: Implement search-utils.ts**

Create `src/components/redis-commander/search-utils.ts`:

```typescript
export type SearchMode = 'glob' | 'regex' | 'fuzzy';

/**
 * Detect search mode based on input pattern.
 * Glob (contains * or ?) > Regex (contains regex special chars) > Fuzzy (default)
 */
export function detectSearchMode(input: string): SearchMode {
  if (input.includes('*') || input.includes('?')) return 'glob';
  if (/[\^\$\[\]\(\)\{\}\.\|\+\\]/.test(input)) return 'regex';
  return 'fuzzy';
}

/**
 * Convert glob pattern to regex and match keys.
 * Supports * (any chars) and ? (single char).
 */
export function globMatch(keys: string[], pattern: string): string[] {
  // Escape regex special chars except * and ?
  let regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  
  try {
    const regex = new RegExp(`^${regexPattern}$`);
    return keys.filter(key => regex.test(key));
  } catch {
    return [];
  }
}

/**
 * Match keys against regex pattern.
 * Returns {keys: matched, error?: errorMessage}
 */
export function regexMatch(
  keys: string[],
  pattern: string
): { keys: string[]; error?: string } {
  try {
    const regex = new RegExp(pattern);
    return { keys: keys.filter(key => regex.test(key)) };
  } catch (err) {
    return {
      keys: [],
      error: err instanceof Error ? err.message : 'Invalid regex',
    };
  }
}

/**
 * Fuzzy match: all chars in pattern must appear in key in order (case-insensitive).
 */
export function fuzzyMatch(keys: string[], pattern: string): string[] {
  if (!pattern) return keys;
  
  const lower = pattern.toLowerCase();
  return keys.filter(key => {
    let patternIdx = 0;
    let keyIdx = 0;
    const keyLower = key.toLowerCase();
    
    while (patternIdx < lower.length && keyIdx < keyLower.length) {
      if (lower[patternIdx] === keyLower[keyIdx]) {
        patternIdx++;
      }
      keyIdx++;
    }
    
    return patternIdx === lower.length;
  });
}

/**
 * Get indices of matched characters/segments for highlighting.
 * - Fuzzy: array of char indices
 * - Glob/Regex: array of segment indices [start, end, start, end, ...]
 */
export function getMatchIndices(
  key: string,
  pattern: string,
  mode: SearchMode
): number[] {
  if (mode === 'fuzzy') {
    const indices: number[] = [];
    const lower = pattern.toLowerCase();
    let patternIdx = 0;
    
    for (let keyIdx = 0; keyIdx < key.length && patternIdx < lower.length; keyIdx++) {
      if (lower[patternIdx] === key[keyIdx].toLowerCase()) {
        indices.push(keyIdx);
        patternIdx++;
      }
    }
    
    return indices;
  }
  
  if (mode === 'glob') {
    // Convert glob to regex and find matching portion
    let regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    try {
      const regex = new RegExp(`^(${regexPattern})$`);
      const match = key.match(regex);
      if (match && match[1]) {
        return [0, match[1].length];
      }
    } catch {
      return [];
    }
  }
  
  if (mode === 'regex') {
    try {
      const regex = new RegExp(pattern);
      const match = key.match(regex);
      if (match) {
        const start = match.index ?? 0;
        return [start, start + match[0].length];
      }
    } catch {
      return [];
    }
  }
  
  return [];
}
```

Run: `npm test -- search-utils.test.ts`  
Expected: PASS (all tests)

- [ ] **Step 7: Commit**

```bash
git add src/components/redis-commander/search-utils.ts src/components/redis-commander/__tests__/search-utils.test.ts
git commit -m "feat: add search matching algorithms (glob, regex, fuzzy)"
```

---

### Task 2: Add search-related types

**Files:**
- Modify: `src/components/redis-commander/types.ts`

**Interfaces:**
- Produces: `SearchState` type with `input`, `mode`, `modeOverride`, `filteredKeys`, `regexError`

**Steps:**

- [ ] **Step 1: Add SearchState type to types.ts**

Read current types first:

```bash
head -50 src/components/redis-commander/types.ts
```

Then add to `src/components/redis-commander/types.ts` after existing types:

```typescript
export type SearchMode = 'glob' | 'regex' | 'fuzzy';

export interface SearchState {
  input: string;
  detectedMode: SearchMode;
  userModeOverride: SearchMode | null;
  regexError: string | null;
  matchCount: number;
  showAdvanced: boolean;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/redis-commander/types.ts
git commit -m "feat: add SearchState type"
```

---

### Task 3: Create SearchBar component

**Files:**
- Create: `src/components/redis-commander/search-bar.tsx`

**Interfaces:**
- Consumes: `SearchMode` from types, `detectSearchMode` from search-utils
- Produces: React component `SearchBar` with props:
  - `value: string`
  - `onChange: (value: string) => void`
  - `onClear: () => void`
  - `detectedMode: SearchMode`
  - `matchCount: number`
  - `onToggleAdvanced: () => void`

**Steps:**

- [ ] **Step 1: Create SearchBar component**

Create `src/components/redis-commander/search-bar.tsx`:

```typescript
"use client";

import { IconX, IconSearch, IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchMode } from "./types";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  detectedMode: SearchMode;
  matchCount: number;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
  regexError?: string | null;
}

export function SearchBar({
  value,
  onChange,
  onClear,
  detectedMode,
  matchCount,
  showAdvanced,
  onToggleAdvanced,
  regexError,
}: SearchBarProps) {
  const modeIcon: Record<SearchMode, string> = {
    glob: '⚡',
    fuzzy: '🔍',
    regex: '.*',
  };

  const modeLabel: Record<SearchMode, string> = {
    glob: 'Glob',
    fuzzy: 'Fuzzy',
    regex: 'Regex',
  };

  return (
    <div className="space-y-2 border-b p-2">
      <div className="flex items-center gap-2">
        <IconSearch className="size-4 text-muted-foreground shrink-0" />
        <Input
          type="text"
          placeholder="Search keys… (glob, regex, or fuzzy)"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClear();
          }}
          className={cn(
            "flex-1 h-8 text-sm",
            regexError && "border-destructive"
          )}
        />
        <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          <span>{modeIcon[detectedMode]}</span>
          <span>{matchCount}</span>
        </span>
        {value && (
          <Button
            size="icon"
            variant="ghost"
            className="size-6 h-8"
            onClick={onClear}
          >
            <IconX className="size-3.5" />
          </Button>
        )}
        <Button
          size="icon"
          variant="ghost"
          className="size-6 h-8"
          onClick={onToggleAdvanced}
        >
          {showAdvanced ? (
            <IconChevronUp className="size-3.5" />
          ) : (
            <IconChevronDown className="size-3.5" />
          )}
        </Button>
      </div>
      
      {regexError && (
        <div className="text-xs text-destructive bg-destructive/10 rounded px-2 py-1">
          {regexError}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/redis-commander/search-bar.tsx
git commit -m "feat: add SearchBar component"
```

---

### Task 4: Create AdvancedPanel component

**Files:**
- Create: `src/components/redis-commander/advanced-search-panel.tsx`

**Interfaces:**
- Consumes: `SearchMode` from types
- Produces: React component `AdvancedPanel` with props:
  - `currentMode: SearchMode`
  - `onModeChange: (mode: SearchMode) => void`
  - `onResetToAuto: () => void`

**Steps:**

- [ ] **Step 1: Create AdvancedPanel component**

Create `src/components/redis-commander/advanced-search-panel.tsx`:

```typescript
"use client";

import { Button } from "@/components/ui/button";
import { SearchMode } from "./types";
import { cn } from "@/lib/utils";

interface AdvancedPanelProps {
  currentMode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
  onResetToAuto: () => void;
}

const modeDescriptions: Record<SearchMode, string> = {
  glob: 'Glob: Use * (any chars) and ? (single char). E.g. user:*',
  fuzzy: 'Fuzzy: All chars in pattern must appear in order. E.g. userprofile',
  regex: 'Regex: Full regex support. E.g. ^session:[0-9]+$',
};

export function AdvancedPanel({
  currentMode,
  onModeChange,
  onResetToAuto,
}: AdvancedPanelProps) {
  const modes: SearchMode[] = ['glob', 'fuzzy', 'regex'];

  return (
    <div className="space-y-3 border-b bg-muted/30 p-2">
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">
          {modeDescriptions[currentMode]}
        </p>
        <div className="flex gap-1">
          {modes.map((mode) => (
            <Button
              key={mode}
              size="sm"
              variant={currentMode === mode ? "default" : "outline"}
              className="h-7 text-xs"
              onClick={() => onModeChange(mode)}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Button>
          ))}
        </div>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="h-6 text-xs w-full"
        onClick={onResetToAuto}
      >
        Reset to Auto-Detect
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/redis-commander/advanced-search-panel.tsx
git commit -m "feat: add AdvancedPanel component"
```

---

### Task 5: Integrate search into KeyBrowser (part 1 - state & filtering)

**Files:**
- Modify: `src/components/redis-commander/key-browser.tsx:1-150` (add search state)

**Interfaces:**
- Consumes: `SearchState` type, `detectSearchMode`, `globMatch`, `regexMatch`, `fuzzyMatch` from search-utils
- Produces: Modified KeyBrowser component with search state management

**Steps:**

- [ ] **Step 1: Read current key-browser.tsx to understand structure**

```bash
head -100 src/components/redis-commander/key-browser.tsx
```

- [ ] **Step 2: Add search state to KeyBrowser**

At the top of the component's state (after existing useState calls), add:

```typescript
import { SearchMode, SearchState } from "./types";
import { 
  detectSearchMode, 
  globMatch, 
  regexMatch, 
  fuzzyMatch, 
  getMatchIndices 
} from "./search-utils";
import { useCallback, useRef, useEffect } from "react";
import { debounce } from "lodash-es"; // or create simple debounce helper

// Inside component, after other useState calls:
const [searchState, setSearchState] = useState<Omit<SearchState, 'matchCount'> & { matchCount: number }>({
  input: '',
  detectedMode: 'fuzzy',
  userModeOverride: null,
  regexError: null,
  matchCount: 0,
  showAdvanced: false,
});

const [allKeys, setAllKeys] = useState<RedisKeyInfo[]>([]); // Store unfiltered keys
const [displayedKeys, setDisplayedKeys] = useState<RedisKeyInfo[]>([]); // Filtered keys shown

// Debounce ref for search
const debouncedSearchRef = useRef<ReturnType<typeof debounce> | null>(null);
```

- [ ] **Step 3: Create search handling logic**

Add function after useState calls:

```typescript
const performSearch = useCallback((input: string, mode?: SearchMode, modeOverride?: SearchMode | null) => {
  const effectiveMode = modeOverride || mode || 'fuzzy';
  
  if (!input.trim()) {
    setSearchState(prev => ({
      ...prev,
      input: '',
      detectedMode: detectSearchMode(''),
      regexError: null,
      matchCount: allKeys.length,
    }));
    setDisplayedKeys(allKeys);
    return;
  }

  const detected = detectSearchMode(input);
  let filtered: RedisKeyInfo[] = [];
  let error: string | null = null;

  const useMode = modeOverride || detected;

  if (useMode === 'glob') {
    const keyStrs = allKeys.map(k => k.key);
    const matchedKeys = globMatch(keyStrs, input);
    filtered = allKeys.filter(k => matchedKeys.includes(k.key));
  } else if (useMode === 'regex') {
    const result = regexMatch(allKeys.map(k => k.key), input);
    if (result.error) {
      error = result.error;
      // Fall back to fuzzy
      const keyStrs = allKeys.map(k => k.key);
      const matchedKeys = fuzzyMatch(keyStrs, input);
      filtered = allKeys.filter(k => matchedKeys.includes(k.key));
    } else {
      filtered = allKeys.filter(k => result.keys.includes(k.key));
    }
  } else {
    const keyStrs = allKeys.map(k => k.key);
    const matchedKeys = fuzzyMatch(keyStrs, input);
    filtered = allKeys.filter(k => matchedKeys.includes(k.key));
  }

  setSearchState(prev => ({
    ...prev,
    input,
    detectedMode: detected,
    userModeOverride: modeOverride ?? prev.userModeOverride,
    regexError: error,
    matchCount: filtered.length,
  }));
  setDisplayedKeys(filtered);
}, [allKeys]);

// Create debounced version
const debouncedSearch = useCallback((input: string) => {
  if (!debouncedSearchRef.current) {
    debouncedSearchRef.current = debounce((i: string) => {
      performSearch(i);
    }, 300);
  }
  debouncedSearchRef.current(input);
}, [performSearch]);
```

- [ ] **Step 4: Handle mode override**

Add handlers:

```typescript
const handleSearchChange = useCallback((input: string) => {
  setSearchState(prev => ({ ...prev, input }));
  debouncedSearch(input);
}, [debouncedSearch]);

const handleClearSearch = useCallback(() => {
  setSearchState(prev => ({
    ...prev,
    input: '',
    regexError: null,
    detectedMode: 'fuzzy',
    userModeOverride: null,
    matchCount: allKeys.length,
  }));
  setDisplayedKeys(allKeys);
}, [allKeys]);

const handleModeChange = useCallback((mode: SearchMode) => {
  performSearch(searchState.input, searchState.detectedMode, mode);
}, [searchState.input, searchState.detectedMode, performSearch]);

const handleResetMode = useCallback(() => {
  performSearch(searchState.input, searchState.detectedMode, null);
}, [searchState.input, searchState.detectedMode, performSearch]);

const handleToggleAdvanced = useCallback(() => {
  setSearchState(prev => ({ ...prev, showAdvanced: !prev.showAdvanced }));
}, []);
```

- [ ] **Step 5: Commit**

```bash
git add src/components/redis-commander/key-browser.tsx
git commit -m "feat: add search state management to KeyBrowser"
```

---

### Task 6: Integrate SearchBar UI into KeyBrowser

**Files:**
- Modify: `src/components/redis-commander/key-browser.tsx:150-250` (add UI)

**Steps:**

- [ ] **Step 1: Import SearchBar and AdvancedPanel**

At top of key-browser.tsx:

```typescript
import { SearchBar } from "./search-bar";
import { AdvancedPanel } from "./advanced-search-panel";
```

- [ ] **Step 2: Add SearchBar to render**

Find where the key list is rendered. Before the key list, add:

```typescript
<SearchBar
  value={searchState.input}
  onChange={handleSearchChange}
  onClear={handleClearSearch}
  detectedMode={searchState.detectedMode}
  matchCount={searchState.matchCount}
  showAdvanced={searchState.showAdvanced}
  onToggleAdvanced={handleToggleAdvanced}
  regexError={searchState.regexError}
/>

{searchState.showAdvanced && (
  <AdvancedPanel
    currentMode={searchState.userModeOverride || searchState.detectedMode}
    onModeChange={handleModeChange}
    onResetToAuto={handleResetMode}
  />
)}

{/* Key list - render displayedKeys instead of allKeys */}
{displayedKeys.map(key => (
  // ... existing key render code, but for displayedKeys
))}

{displayedKeys.length === 0 && searchState.input && (
  <div className="p-4 text-center text-sm text-muted-foreground">
    No keys match "{searchState.input}"
  </div>
)}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/redis-commander/key-browser.tsx
git commit -m "feat: integrate SearchBar and AdvancedPanel into KeyBrowser UI"
```

---

### Task 7: Add match highlighting to key display

**Files:**
- Modify: `src/components/redis-commander/key-browser.tsx` (key render section)

**Steps:**

- [ ] **Step 1: Create HighlightedKeyText component**

Add before the component export in key-browser.tsx:

```typescript
interface HighlightedKeyTextProps {
  text: string;
  indices: number[];
  mode: SearchMode;
}

function HighlightedKeyText({ text, indices, mode }: HighlightedKeyTextProps) {
  if (indices.length === 0) return <span>{text}</span>;

  if (mode === 'fuzzy') {
    // Indices are individual char positions
    const indicesSet = new Set(indices);
    return (
      <span>
        {text.split('').map((char, i) => (
          <span
            key={i}
            className={indicesSet.has(i) ? 'bg-yellow-200/50' : ''}
          >
            {char}
          </span>
        ))}
      </span>
    );
  }

  // Glob or regex: indices are [start, end]
  if (indices.length >= 2) {
    const start = indices[0];
    const end = indices[1];
    return (
      <span>
        {text.substring(0, start)}
        <span className="bg-blue-200/50">
          {text.substring(start, end)}
        </span>
        {text.substring(end)}
      </span>
    );
  }

  return <span>{text}</span>;
}
```

- [ ] **Step 2: Use HighlightedKeyText in key rendering**

When rendering each key name, use getMatchIndices to get indices and render with HighlightedKeyText:

```typescript
{displayedKeys.map(keyInfo => {
  const isSelected = selectedKey === keyInfo.key;
  const highlightIndices = searchState.input 
    ? getMatchIndices(
        keyInfo.key, 
        searchState.input, 
        searchState.userModeOverride || searchState.detectedMode
      )
    : [];

  return (
    <div
      key={keyInfo.key}
      onClick={() => onSelectKey(keyInfo.key)}
      className={cn(
        "flex items-center gap-2 px-3 py-2 text-sm cursor-pointer rounded-md transition-colors hover:bg-accent",
        isSelected && "bg-accent"
      )}
    >
      {/* Key type icon */}
      <span className="text-xs text-muted-foreground">{getKeyIcon(keyInfo.type)}</span>
      
      {/* Key name with highlighting */}
      <span className="flex-1 font-mono text-xs truncate">
        <HighlightedKeyText
          text={keyInfo.key}
          indices={highlightIndices}
          mode={searchState.userModeOverride || searchState.detectedMode}
        />
      </span>
      
      {/* TTL badge */}
      {keyInfo.ttl > 0 && (
        <span className="text-xs text-muted-foreground">{keyInfo.ttl}s</span>
      )}
    </div>
  );
})}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/redis-commander/key-browser.tsx
git commit -m "feat: add match highlighting to key display"
```

---

### Task 8: Handle search state reset on tab change

**Files:**
- Modify: `src/components/redis-commander/key-browser.tsx` (useEffect section)

**Steps:**

- [ ] **Step 1: Add useEffect to clear search when tab/connection changes**

Add useEffect hook:

```typescript
// Clear search when tab/connection changes
useEffect(() => {
  handleClearSearch();
}, [redisUrl]); // redisUrl changes = new tab/connection
```

- [ ] **Step 2: Commit**

```bash
git add src/components/redis-commander/key-browser.tsx
git commit -m "feat: clear search state on tab change"
```

---

### Task 9: Test end-to-end search functionality

**Files:**
- Modify: `src/components/redis-commander/key-browser.tsx`

**Steps:**

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test novice user flow**

- Navigate to Redis Commander
- Open a connection with several keys
- Type "user_" in search box → should filter to fuzzy mode automatically
- Type more characters → results narrow
- Click clear button → search resets

- [ ] **Step 3: Test glob pattern**

- Clear search
- Type "session:*" in search box → should detect glob mode (icon shows ⚡)
- Verify results match only "session:*" pattern keys
- Highlight should show blue segment

- [ ] **Step 4: Test regex pattern**

- Clear search
- Type "^[a-z]+:[0-9]{3}$" in search box → should detect regex mode (icon shows .*)
- Verify results match pattern

- [ ] **Step 5: Test regex error handling**

- Type invalid regex "^[invalid" → should show error message, fall back to fuzzy
- Fix the regex → error should clear

- [ ] **Step 6: Test mode override**

- Type "user*" (fuzzy pattern that looks like glob with *)
- Click advanced toggle → panel opens
- Click "Glob" button → results change to glob matching
- Click "Reset to Auto-Detect" → goes back to auto

- [ ] **Step 7: Test keyboard shortcuts**

- Focus search box
- Press Escape → search clears

- [ ] **Step 8: Test tab close**

- Type in search box
- Close tab (or switch connection)
- Re-open connection → search should be empty

- [ ] **Step 9: Verify performance**

- Create test data with 1000+ keys (or use existing large dataset)
- Type search patterns
- Verify no lag, filtering is instant

---

### Task 10: Code cleanup & final commit

**Files:**
- Verify all files

**Steps:**

- [ ] **Step 1: Remove any console.log or debug code**

Search for `console.log` in modified files:

```bash
grep -n "console.log" src/components/redis-commander/key-browser.tsx
```

Remove if any.

- [ ] **Step 2: Run linter**

```bash
npm run lint -- src/components/redis-commander/
```

Fix any linting errors.

- [ ] **Step 3: Run full test suite**

```bash
npm test -- search-utils.test.ts
```

All tests should pass.

- [ ] **Step 4: Run type check**

```bash
npm run type-check
# or
tsc --noEmit
```

No TypeScript errors.

- [ ] **Step 5: Final commit with summary**

```bash
git log --oneline | head -10  # See all commits from this feature
```

If needed, squash related commits:

```bash
git rebase -i HEAD~<number>
```

Or leave as separate commits (each commit = working state = good for review).

---

## Testing Strategy Summary

### Unit Tests (Already done in Task 1)
- ✅ globMatch, regexMatch, fuzzyMatch, detectSearchMode, getMatchIndices

### Integration Tests (Manual in Task 9)
- ✅ Live search filtering works
- ✅ Mode detection correct
- ✅ Clear button resets
- ✅ Tab change clears search
- ✅ Mode toggle works
- ✅ Error handling works
- ✅ Performance acceptable

### To Add Later (Phase 2)
- Saved searches per connection
- Search history
- Keyboard shortcut Cmd+F

---

## Success Criteria

✅ All matching algorithms tested and working  
✅ SearchBar + AdvancedPanel components render correctly  
✅ Search filters keys live (300ms debounce)  
✅ Mode auto-detection works for glob/regex/fuzzy  
✅ Users can override auto-detection  
✅ Regex errors are caught, fallback to fuzzy  
✅ Highlighting shows matched chars/segments  
✅ Search persists while tab open, clears on close  
✅ Performance: no lag with 1000+ keys  
✅ Keyboard: Escape clears search  
✅ All tests pass, no linting errors  

---

## Rollout

**v1 (Phase 1a+1b complete):** SearchBar + filtering + error handling + highlighting  
**v2 (future - Phase 1c):** Saved searches, search history
