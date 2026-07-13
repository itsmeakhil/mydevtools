// Note templates. `content` is a markdown string applied into the editor.

export interface NoteTemplate {
  id: string;
  label: string;
  icon: string;
  description: string;
  content: string;
  defaultTitle: string;
}

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: "blank",
    label: "Blank",
    icon: "📄",
    description: "Start from scratch",
    defaultTitle: "Untitled",
    content: "",
  },
  {
    id: "meeting",
    label: "Meeting Notes",
    icon: "🤝",
    description: "Attendees, agenda, action items",
    defaultTitle: "Meeting Notes",
    content: [
      "## Attendees",
      "- ",
      "",
      "## Agenda",
      "- ",
      "",
      "## Notes",
      "",
      "## Action Items",
      "- ",
      "",
    ].join("\n"),
  },
  {
    id: "daily",
    label: "Daily Journal",
    icon: "📅",
    description: "Goals, notes, reflection",
    defaultTitle: "Daily Journal",
    content: [
      "## Today's Goals",
      "- ",
      "- ",
      "",
      "## Notes",
      "",
      "---",
      "",
      "## Reflection",
      "",
    ].join("\n"),
  },
  {
    id: "bug",
    label: "Bug Report",
    icon: "🐛",
    description: "Summary, steps, expected/actual",
    defaultTitle: "Bug Report",
    content: [
      "## Summary",
      "",
      "## Steps to Reproduce",
      "1. ",
      "2. ",
      "",
      "## Expected Behaviour",
      "",
      "## Actual Behaviour",
      "",
      "## Fix / Notes",
      "",
    ].join("\n"),
  },
];
