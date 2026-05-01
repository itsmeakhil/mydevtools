import { ContainerNode, TextNode } from "@/components/ui/rich-editor/types";

function id() {
  return Math.random().toString(36).slice(2, 10);
}

function p(text = ""): TextNode {
  return { id: id(), type: "p", content: text, attributes: {} };
}
function h2(text: string): TextNode {
  return { id: id(), type: "h2", content: text, attributes: {} };
}
function li(text: string): TextNode {
  return { id: id(), type: "li", content: text, attributes: {} };
}
function hr(): TextNode {
  return { id: id(), type: "hr", content: "", attributes: {} };
}

function container(children: (TextNode | ContainerNode)[]): ContainerNode {
  return { id: id(), type: "container", children, attributes: {} };
}

export interface NoteTemplate {
  id: string;
  label: string;
  icon: string;
  description: string;
  content: ContainerNode;
  defaultTitle: string;
}

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: "blank",
    label: "Blank",
    icon: "📄",
    description: "Start from scratch",
    defaultTitle: "Untitled",
    content: container([p(), p(), p()]),
  },
  {
    id: "meeting",
    label: "Meeting Notes",
    icon: "🤝",
    description: "Attendees, agenda, action items",
    defaultTitle: "Meeting Notes",
    content: container([
      h2("Attendees"),
      li(""),
      h2("Agenda"),
      li(""),
      h2("Notes"),
      p(""),
      h2("Action Items"),
      li(""),
    ]),
  },
  {
    id: "daily",
    label: "Daily Journal",
    icon: "📅",
    description: "Goals, notes, reflection",
    defaultTitle: "Daily Journal",
    content: container([
      h2("Today's Goals"),
      li(""),
      li(""),
      h2("Notes"),
      p(""),
      hr(),
      h2("Reflection"),
      p(""),
    ]),
  },
  {
    id: "bug",
    label: "Bug Report",
    icon: "🐛",
    description: "Summary, steps, expected/actual",
    defaultTitle: "Bug Report",
    content: container([
      h2("Summary"),
      p(""),
      h2("Steps to Reproduce"),
      li(""),
      li(""),
      h2("Expected Behaviour"),
      p(""),
      h2("Actual Behaviour"),
      p(""),
      h2("Fix / Notes"),
      p(""),
    ]),
  },
];
