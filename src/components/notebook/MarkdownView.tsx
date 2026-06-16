"use client";

/**
 * Minimal, dependency-light Markdown renderer for markdown cells.
 *
 * We intentionally avoid pulling in a full markdown library; the
 * subset we support (headings, bold, italic, inline code, code
 * blocks, lists, links, paragraphs) covers the common notebook
 * authoring cases. For richer rendering, swap this component for
 * `react-markdown` (already installed).
 */

import { useMemo } from "react";

interface MarkdownViewProps {
  source: string;
}

export function MarkdownView({ source }: MarkdownViewProps) {
  const html = useMemo(() => renderMarkdown(source), [source]);
  return (
    <div
      className="prose prose-sm max-w-none dark:prose-invert prose-headings:mb-2 prose-headings:mt-1 prose-p:my-2 prose-pre:bg-muted prose-pre:rounded-md prose-code:before:content-none prose-code:after:content-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * Render a very small subset of Markdown to HTML.
 * This is NOT a security boundary — notebook authors run their own
 * code, so trusting their markdown is acceptable inside this app.
 */
function renderMarkdown(src: string): string {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let i = 0;
  let inCode = false;
  let codeBuf: string[] = [];
  let codeLang = "";

  const inline = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/`([^`]+)`/g, '<code class="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="underline underline-offset-2 hover:opacity-80">$1</a>');

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim().startsWith("```")) {
      if (!inCode) {
        inCode = true;
        codeLang = line.trim().slice(3);
        codeBuf = [];
      } else {
        inCode = false;
        const langClass = codeLang ? ` language-${codeLang}` : "";
        out.push(
          `<pre class="rounded-md bg-muted p-3 overflow-x-auto"><code class="font-mono text-[12.5px]${langClass}">${escapeHtml(codeBuf.join("\n"))}</code></pre>`,
        );
      }
      i++;
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      i++;
      continue;
    }

    if (/^#{1,6}\s/.test(line)) {
      const level = line.match(/^#+/)![0].length;
      const text = inline(line.replace(/^#+\s/, ""));
      out.push(`<h${level}>${text}</h${level}>`);
      i++;
      continue;
    }
    if (/^\s*[-*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s/.test(lines[i])) {
        items.push(`<li>${inline(lines[i].replace(/^\s*[-*]\s/, ""))}</li>`);
        i++;
      }
      out.push(`<ul class="list-disc pl-5 my-2 space-y-1">${items.join("")}</ul>`);
      continue;
    }
    if (/^\s*\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s/.test(lines[i])) {
        items.push(`<li>${inline(lines[i].replace(/^\s*\d+\.\s/, ""))}</li>`);
        i++;
      }
      out.push(`<ol class="list-decimal pl-5 my-2 space-y-1">${items.join("")}</ol>`);
      continue;
    }
    if (line.trim() === "") {
      i++;
      continue;
    }
    // paragraph: collect consecutive non-empty, non-special lines
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^#{1,6}\s/.test(lines[i]) &&
      !/^\s*[-*]\s/.test(lines[i]) &&
      !/^\s*\d+\.\s/.test(lines[i]) &&
      !lines[i].trim().startsWith("```")
    ) {
      para.push(lines[i]);
      i++;
    }
    out.push(`<p>${inline(para.join(" "))}</p>`);
  }

  if (inCode && codeBuf.length) {
    // Unclosed code block — render what we have
    out.push(
      `<pre class="rounded-md bg-muted p-3 overflow-x-auto"><code class="font-mono text-[12.5px]">${escapeHtml(codeBuf.join("\n"))}</code></pre>`,
    );
  }

  return out.join("\n");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
