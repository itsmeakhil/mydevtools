"use client";

import { useEffect } from "react";

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  callback: (event: KeyboardEvent) => void;
  description: string;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[], enabled: boolean = true) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields, textareas, or contenteditable elements
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        // Allow some shortcuts even in input fields (like Escape)
        if (event.key !== "Escape") {
          return;
        }
      }

      for (const shortcut of shortcuts) {
        const keyMatch = shortcut.key.toLowerCase() === event.key.toLowerCase();
        const ctrlMatch = shortcut.ctrlKey === undefined || shortcut.ctrlKey === event.ctrlKey;
        const shiftMatch = shortcut.shiftKey === undefined || shortcut.shiftKey === event.shiftKey;
        const altMatch = shortcut.altKey === undefined || shortcut.altKey === event.altKey;
        const metaMatch = shortcut.metaKey === undefined || shortcut.metaKey === event.metaKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch) {
          event.preventDefault();
          shortcut.callback(event);
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts, enabled]);
};

export const TASK_SHORTCUTS: KeyboardShortcut[] = [
  {
    key: "n",
    description: "New task",
    callback: () => {},
  },
  {
    key: "/",
    description: "Focus search",
    callback: () => {},
  },
  {
    key: "Escape",
    description: "Clear search / Close dialogs",
    callback: () => {},
  },
  {
    key: "k",
    description: "Toggle view (Kanban/List)",
    callback: () => {},
  },
  {
    key: "?",
    shiftKey: true,
    description: "Show keyboard shortcuts",
    callback: () => {},
  },
  {
    key: "a",
    description: "Show all tasks",
    callback: () => {},
  },
  {
    key: "1",
    description: "Filter: Not Started",
    callback: () => {},
  },
  {
    key: "2",
    description: "Filter: Ongoing",
    callback: () => {},
  },
  {
    key: "3",
    description: "Filter: Completed",
    callback: () => {},
  },
];

