"use client";

/**
 * Code editor for notebook cells.
 *
 * Wraps @uiw/react-codemirror with sane defaults: Python language
 * support, One Dark theme, line wrapping, and bracket-closing. The
 * parent cell passes the source and an onChange callback.
 *
 * Shift+Enter runs the cell; Ctrl+Enter runs and stays; Alt+Enter
 * runs and inserts a new cell below. These shortcuts match JupyterLab.
 */

import { useCallback, useSyncExternalStore } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView } from "@codemirror/view";
import { useTheme } from "next-themes";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onRun?: () => void;
  onRunAndInsert?: () => void;
  onSplit?: (position: number) => void;
  readOnly?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  wordWrap?: boolean;
  lineNumbers?: boolean;
}

export function CodeEditor({
  value,
  onChange,
  onRun,
  onRunAndInsert,
  onSplit,
  readOnly,
  autoFocus,
  placeholder,
  wordWrap = false,
  lineNumbers = true,
}: CodeEditorProps) {
  const { resolvedTheme } = useTheme();
  // useSyncExternalStore is the React-blessed way to detect "are we
  // mounted on the client" without triggering the set-state-in-effect
  // lint rule. Returns false during SSR, true after hydration.
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  // Until we know the resolved theme on the client, render with a
  // neutral theme to avoid hydration mismatches.
  const isDark = isMounted && resolvedTheme === "dark";

  // Split-cell shortcut: Ctrl+Shift+- (or Cmd+Shift+-).
  // The handler reads the cursor position from the EditorView that
  // CodeMirror passes as the second argument to domEventHandlers callbacks.
  // No refs needed — all values are captured in the deps array.
  const domKeydown = useCallback(
    (e: Event, view: EditorView) => {
      const ke = e as KeyboardEvent;
      // Run shortcuts
      if (ke.key === "Enter" && (ke.shiftKey || ke.ctrlKey || ke.metaKey)) {
        ke.preventDefault();
        onRun?.();
        return false;
      }
      if (ke.key === "Enter" && ke.altKey) {
        ke.preventDefault();
        onRunAndInsert?.();
        return false;
      }
      // Ctrl+Shift+- -> split at cursor
      if ((ke.ctrlKey || ke.metaKey) && ke.shiftKey && (ke.key === "-" || ke.key === "_")) {
        const pos = view.state.selection.main.head;
        ke.preventDefault();
        onSplit?.(pos);
        return false;
      }
      return true;
    },
    [onRun, onRunAndInsert, onSplit],
  );

  return (
    <div className="codemirror-wrapper text-sm">
      <CodeMirror
        value={value}
        onChange={onChange}
        theme={isDark ? oneDark : "light"}
        extensions={[
          python(),
          ...(wordWrap ? [EditorView.lineWrapping] : []),
          EditorView.theme({
            "&": {
              fontSize: "13.5px",
              backgroundColor: "transparent",
            },
            ".cm-content": {
              fontFamily:
                "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              padding: "12px 14px",
            },
            ".cm-gutters": {
              backgroundColor: "transparent",
              border: "none",
            },
            ".cm-activeLine": {
              backgroundColor: "rgba(127, 127, 127, 0.08)",
            },
            ".cm-activeLineGutter": {
              backgroundColor: "transparent",
            },
            "&.cm-focused": {
              outline: "none",
            },
            ".cm-scroller": {
              fontFamily:
                "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            },
          }),
          EditorView.domEventHandlers({
            keydown: domKeydown as unknown as (e: Event, view: EditorView) => boolean,
          }),
        ]}
        readOnly={readOnly}
        autoFocus={autoFocus}
        placeholder={placeholder}
        basicSetup={{
          lineNumbers,
          highlightActiveLine: true,
          highlightActiveLineGutter: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          indentOnInput: true,
          foldGutter: false,
          highlightSelectionMatches: true,
          tabSize: 4,
        }}
        height="auto"
        // Keep the editor from grabbing the whole viewport height
        // when the cell is collapsed.
        minHeight="2.5rem"
      />
    </div>
  );
}
