"use client";

import { Check, Copy, ExternalLink, QrCode, X } from "lucide-react";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

export function ShareModal({ url, onClose }: { url: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard unavailable
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-line bg-panel p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10">
            <QrCode className="h-3.5 w-3.5 text-accent" />
          </span>
          <h2 className="text-sm font-semibold">分享生成的应用</h2>
          <button
            onClick={onClose}
            aria-label="关闭"
            className="ml-auto rounded-md p-1 text-muted transition hover:bg-panel2 hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-2 text-[10.5px] leading-relaxed text-muted">
          任何拿到链接的人都可以打开并交互；应用数据保存在各自浏览器。
        </p>

        <div className="mt-4 flex justify-center rounded-xl bg-white p-4">
          <QRCodeSVG value={url} size={200} bgColor="#ffffff" fgColor="#0b3b36" level="M" />
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-lg border border-line bg-panel2 px-2.5 py-2">
          <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-muted">
            {url}
          </span>
          <button
            onClick={copy}
            className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[10px] text-muted transition hover:bg-panel hover:text-ink"
          >
            {copied ? <Check className="h-3 w-3 text-accent" /> : <Copy className="h-3 w-3" />}
            {copied ? "已复制" : "复制"}
          </button>
        </div>

        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-[#06231a] transition hover:brightness-105"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          在新标签页打开
        </a>
      </div>
    </div>
  );
}
