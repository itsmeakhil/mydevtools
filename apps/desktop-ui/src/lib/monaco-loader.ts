import { loader } from "@monaco-editor/react";

// Serve Monaco from the app bundle (scripts/copy-monaco.mjs → public/monaco/vs)
// instead of the loader's jsdelivr default. Must run before any <Editor> mounts;
// imported once from the client shell for that reason.
loader.config({ paths: { vs: "/monaco/vs" } });
