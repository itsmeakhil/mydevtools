import {
    noteContentToMarkdown,
    contentToMarkdown,
    extractPlainText,
    countWords,
    readingTimeMinutes,
} from "../noteContentUtils";

// Helpers to build legacy rich-editor tree nodes concisely.
const text = (type: string, content: string, extra: Record<string, unknown> = {}) => ({
    type,
    content,
    attributes: {},
    ...extra,
});
const container = (children: unknown[], attributes: Record<string, unknown> = {}) => ({
    type: "container",
    children,
    attributes,
});

describe("noteContentToMarkdown", () => {
    it("passes markdown strings through untouched", () => {
        expect(noteContentToMarkdown("# Hello\n\nworld")).toBe("# Hello\n\nworld");
    });

    it("returns empty string for null/undefined/garbage", () => {
        expect(noteContentToMarkdown(null)).toBe("");
        expect(noteContentToMarkdown(undefined)).toBe("");
        expect(noteContentToMarkdown(42)).toBe("");
    });

    it("converts a legacy tree of headings/paragraphs/quotes", () => {
        const tree = container([
            text("h1", "Title"),
            text("p", "A paragraph."),
            text("h2", "Sub"),
            text("blockquote", "quoted"),
            text("hr", ""),
        ]);
        expect(noteContentToMarkdown(tree)).toBe(
            "# Title\nA paragraph.\n## Sub\n> quoted\n---"
        );
    });

    it("converts bullet list items", () => {
        const tree = container([text("li", "one"), text("li", "two")]);
        expect(noteContentToMarkdown(tree)).toBe("- one\n- two");
    });

    it("numbers ordered lists via listType attribute", () => {
        const tree = container(
            [text("li", "first"), text("li", "second")],
            { listType: "ordered" }
        );
        expect(noteContentToMarkdown(tree)).toBe("1. first\n2. second");
    });

    it("converts images and links", () => {
        const tree = container([
            text("img", "", { attributes: { src: "https://x/y.png", alt: "pic" } }),
            text("a", "click", { attributes: { href: "https://x" } }),
        ]);
        expect(noteContentToMarkdown(tree)).toBe("![pic](https://x/y.png)\n[click](https://x)");
    });

    it("converts inline-formatted children", () => {
        const tree = container([
            {
                type: "p",
                attributes: {},
                children: [
                    { content: "bold", bold: true },
                    { content: " and " },
                    { content: "code", code: true },
                ],
            },
        ]);
        expect(noteContentToMarkdown(tree)).toBe("**bold** and `code`");
    });

    it("converts code blocks", () => {
        const tree = container([text("pre", "const a = 1")]);
        expect(noteContentToMarkdown(tree)).toBe("```\nconst a = 1\n```");
    });

    it("converts a table to GFM", () => {
        const tree = container([
            {
                type: "table",
                attributes: {},
                children: [
                    {
                        type: "tbody",
                        attributes: {},
                        children: [
                            { type: "tr", attributes: {}, children: [text("p", "A"), text("p", "B")] },
                            { type: "tr", attributes: {}, children: [text("p", "1"), text("p", "2")] },
                        ],
                    },
                ],
            },
        ]);
        expect(noteContentToMarkdown(tree)).toBe(
            "| A | B |\n| --- | --- |\n| 1 | 2 |"
        );
    });
});

describe("contentToMarkdown (export)", () => {
    it("prepends the title as an h1", () => {
        expect(contentToMarkdown("My Note", "body text")).toBe("# My Note\n\nbody text");
    });
    it("works with legacy trees too", () => {
        const tree = container([text("p", "hi")]);
        expect(contentToMarkdown("T", tree)).toBe("# T\n\nhi");
    });
});

describe("extractPlainText", () => {
    it("strips markdown syntax", () => {
        const md = "# H\n\nsome **bold** and `code` and [link](https://x) and ![i](y.png)\n\n- a\n- b";
        const plain = extractPlainText(md);
        expect(plain).toContain("some bold and code and link");
        expect(plain).not.toContain("**");
        expect(plain).not.toContain("![");
        expect(plain).not.toContain("#");
    });
    it("extracts text from legacy trees", () => {
        const tree = container([text("h1", "Hello"), text("p", "world")]);
        expect(extractPlainText(tree)).toBe("Hello world");
    });
    it("counts words and reading time", () => {
        expect(countWords("one two three")).toBe(3);
        expect(readingTimeMinutes(0)).toBe(1);
        expect(readingTimeMinutes(400)).toBe(2);
    });
});
