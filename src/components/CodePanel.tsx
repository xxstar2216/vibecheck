"use client";

import { Check, Code2, Copy, Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { download, safeFilename } from "@/lib/utils";

export function CodePanel({
  code,
  streaming,
  appName,
}: {
  code: string;
  streaming: boolean;
  appName: string;
}) {
  const [copied, setCopied] = useState(false);
  const lines = code ? code.split("\n") : [];
  const bytes = new TextEncoder().encode(code).length;

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard may be unavailable in some contexts
    }
  }

  if (!code) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-panel">
          <Code2 className="h-5 w-5 text-faint" />
        </div>
        <p className="text-sm text-muted">还没有代码</p>
        <p className="max-w-xs text-xs leading-relaxed text-faint">
          生成应用后，这里会展示完整的单文件 HTML。代码是流式返回的。
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-line px-3">
        <span className="rounded-md border border-line bg-panel2 px-2 py-1 font-mono text-[10px] text-muted">
          index.html
        </span>
        <span className="text-[10px] text-faint">
          {(bytes / 1024).toFixed(1)}KB · {lines.length} 行
        </span>
        {streaming && (
          <span className="inline-flex items-center gap-1 text-[10px] text-accent">
            <Loader2 className="h-3 w-3 animate-spin" />
            生成中
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={copy}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted transition hover:bg-panel2 hover:text-ink"
          >
            {copied ? <Check className="h-3 w-3 text-accent" /> : <Copy className="h-3 w-3" />}
            {copied ? "已复制" : "复制"}
          </button>
          <button
            onClick={() => download(`${safeFilename(appName)}.html`, code, "text/html;charset=utf-8")}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted transition hover:bg-panel2 hover:text-ink"
          >
            <Download className="h-3 w-3" />
            下载
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto scrollbar-thin bg-[#07080b]">
        <div className="flex min-h-full font-mono text-[11.5px] leading-5">
          <div className="select-none border-r border-line/50 bg-panel/40 px-3 py-3 text-right tabular-nums text-faint">
            {lines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          <pre className="min-w-0 flex-1 overflow-x-auto px-3 py-3 text-ink/90">
            <code>{code}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
