# Redis Commander: Smart Key Search (Phase 1 - DX Improvements)

**Date:** 2026-06-17  
**Scope:** Enhanced key discovery for Redis Commander with live pattern matching  
**Target:** Instances with thousands of keys, make finding specific keys fast and intuitive

---

## Overview

Add intelligent search/filtering to the key browser. Users can find keys using glob patterns, fuzzy search, or regex — with auto-detection so novice users get sensible defaults and power users can override when needed.

## Problem

Currently browsing Redis instances with thousands of keys requires scrolling through infinite list. No efficient way to find specific keys. Users need:
- Quick key lookup without manual scrolling
- Support for common filtering patterns (glob, fuzzy, regex)
- Live feedback as they type

## Solution

**Smart Key Search** — search box at top of key browser with:
- **Auto-detection:** Input analyzed to guess pattern type (glob → regex → fuzzy)
- **Live filtering:** Results update as user types (300ms debounce)
- **Optional override:** Collapsible advanced panel lets power users pick mode explicitly
- **Client-side:** All matching happens on already-loaded keys (no server round-trip)

---

## Architecture

### Client-Side Search Pipeline

```
User Input
    ↓
Debounce (300ms)
    ↓
Pattern Detection (glob > regex > fuzzy)
    ↓
Filter Loaded Keys
    ↓
Render Results + Match Highlighting
```

### Pattern Detection Rules

| Input | Detected Mode | Example |
|-------|---------------|---------|
| Contains `*` or `?` | Glob | `session:*`, `user:?` |
| Contains regex chars (`^`, `[`, `]`, `(`, `)`, `{`, `}`, `.`, `\|`, `+`) | Regex | `^user_[0-9]+$` |
| Otherwise | Fuzzy | `userprofile` matches `user_profile` |

### Fallback Behavior

- Regex syntax error → show error tooltip, fall back to fuzzy search temporarily
- No matches → display "No keys match" with hint about current mode

---

## Components

### 1. SearchBar
**Location:** Top of KeyBrowser component  
**Props:**
- `searchValue: string`
- `onSearchChange: (value: string) => void`
- `detectedMode: 'glob' | 'regex' | 'fuzzy'`
- `matchCount: number`

**UI:**
- Input field with placeholder "Search keys… (glob, regex, or fuzzy)"
- Icon showing detected mode (⚡ glob, 🔍 fuzzy, `.*` regex)
- Match count badge ("42 matches")
- Clear button (×)

### 2. AdvancedPanel (Collapsible)
**Trigger:** Chevron/expand icon next to match count  
**Contents:**
- Current mode label with explanation ("Fuzzy: Matches any substring")
- Three toggle buttons: [Glob] [Fuzzy] [Regex]
- Selected mode highlighted
- "Reset to auto-detect" button

### 3. HighlightedKeyList
**Behavior:**
- Show filtered keys only
- If fuzzy search: highlight matching characters with subtle background
- If glob/regex: highlight full matching segment
- Maintain existing key browser UI (type icons, TTL, etc.)

### 4. ErrorState
**When regex compile fails:**
- Inline error message: "Invalid regex: [error detail]"
- Auto-fallback to fuzzy search
- User can fix regex or switch mode

---

## Data Flow & State

### Component State (KeyBrowser)
```typescript
const [searchInput, setSearchInput] = useState('');
const [detectedMode, setDetectedMode] = useState<'glob' | 'regex' | 'fuzzy'>('fuzzy');
const [userModeOverride, setUserModeOverride] = useState<string | null>(null);
const [filteredKeys, setFilteredKeys] = useState<RedisKeyInfo[]>([]);
```

### Search Logic (Pseudo)
```typescript
function handleSearchChange(input: string) {
  setSearchInput(input);
  
  if (!input.trim()) {
    setFilteredKeys(allKeys);
    return;
  }
  
  const mode = userModeOverride || detectMode(input);
  setDetectedMode(mode);
  
  const results = filterKeys(allKeys, input, mode);
  setFilteredKeys(results);
}

function detectMode(input: string): 'glob' | 'regex' | 'fuzzy' {
  if (input.includes('*') || input.includes('?')) return 'glob';
  if (/[\^$\[\](){}.\|+]/.test(input)) return 'regex';
  return 'fuzzy';
}

function filterKeys(keys: RedisKeyInfo[], pattern: string, mode: string): RedisKeyInfo[] {
  if (mode === 'glob') return globMatch(keys, pattern);
  if (mode === 'regex') return regexMatch(keys, pattern);
  return fuzzyMatch(keys, pattern);
}
```

### Matching Implementations

**Glob:** Use glob-to-regex library or simple `*` → `.*`, `?` → `.`  
**Regex:** Direct `new RegExp(pattern)` with try-catch  
**Fuzzy:** Every character in pattern must appear in order (case-insensitive)

---

## Behavior & Edge Cases

### Search Lifecycle
1. Search persists while tab is open
2. Closes/resets when tab closed or connection switched
3. Empty search always shows all keys (current state)

### Debouncing
- 300ms debounce on input to avoid excessive filtering
- Clear button is instant (no debounce)

### Performance
- All filtering happens on already-loaded keys (client-side)
- No server calls during search
- For millions of keys: paginated key list + search filters on current page
- Highlight computation only for visible results

### Keyboard Navigation
- **Cmd+F / Ctrl+F** in key browser focuses search input (existing browser shortcut, don't override)
- **Escape** clears search and refocuses key list
- **Enter** in search box is no-op (search is live)

### Match Highlighting
- **Fuzzy:** Matching characters highlighted with `bg-yellow-200/50` (subtle)
- **Glob/Regex:** Full matched segment highlighted with `bg-blue-200/50`
- Highlighting only when search is active

---

## UX Flows

### Happy Path: Novice User
1. Types "user_" in search box
2. Auto-detection → Fuzzy mode
3. Results narrow: "user_profile", "user_settings", "user_123" appear
4. Clicks one to view

### Power User: Regex
1. Clicks in search box
2. Types `^session:[0-9]{3}$` (exact pattern)
3. Auto-detection recognizes regex
4. Mode icon changes to `.*`
5. Results show matching sessions

### Correction: Regex Syntax Error
1. User types invalid regex `^user[`
2. Error shown inline: "Invalid regex: Unterminated character class"
3. Search falls back to fuzzy automatically
4. Shows "fuzzy: no matches" (user can clear and retry)

---

## Implementation Strategy

### Phase 1a (Required)
- Add SearchBar component with input + mode icon
- Implement three matching algorithms (glob, regex, fuzzy)
- Integrate into KeyBrowser, filter displayed keys
- Debounce search input

### Phase 1b (Polish)
- AdvancedPanel with mode toggles
- Match highlighting with character/segment markers
- Error handling for invalid regex
- Keyboard shortcuts (Escape to clear)

### Phase 1c (Future)
- Saved searches per connection (localStorage)
- Search history
- Keyboard shortcut Cmd+F (conflicts with browser find, skip for now)

---

## Files to Modify/Create

### New Files
- `components/redis-commander/search-bar.tsx` — Input + mode display
- `components/redis-commander/search-utils.ts` — Glob/regex/fuzzy matching logic
- `components/redis-commander/advanced-search-panel.tsx` — Mode toggles & controls

### Modified Files
- `components/redis-commander/key-browser.tsx` — Integrate SearchBar, wire up filtering
- `components/redis-commander/types.ts` — Add search-related types if needed

---

## Testing Strategy

### Unit Tests (search-utils.ts)
- Glob matching: `user:*` matches `user:123`, `user:profile`
- Glob edge cases: no matches, special chars, escaped `\*`
- Regex matching: valid patterns, error cases
- Fuzzy matching: case-insensitive, order preserved, no matches

### Integration Tests (key-browser.tsx)
- Search input updates filtered list live
- Mode detection works correctly
- Clear button resets
- Tab change clears search
- Mode toggle works

### Manual Testing
- Search 1000+ key list, verify no lag
- Type invalid regex, verify error + fallback
- Switch modes, verify results change
- Close/reopen tab, verify search cleared

---

## Success Criteria

✅ Finding keys in thousands-key instance is fast and intuitive  
✅ Glob/fuzzy/regex all work without configuration  
✅ Live search has no perceptible lag  
✅ Users can override auto-detection if needed  
✅ Errors are clear and recoverable  

---

## Rollout

**v1 (Phase 1a+1b):** SearchBar + filtering + error handling + highlighting  
**v2 (Phase 1c):** Saved searches, search history (future phase)
