"use client";

import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import { buildSrcDoc } from "@/lib/quality";

export function SharedPreview({
  id,
  name,
  code,
}: {
  id: string;
  name: string;
  code: string;
}) {
  const srcDoc = useMemo(() => buildSrcDoc(code, null), [code]);

  useEffect(() => {
    document.title = `${name} · VibeCheck`;
  }, [name]);

  useEffect(() => {
    async function onMessage(event: MessageEvent) {
      const data = event.data as Record<string, unknown> | null;
      if (!data || data.__atoms !== true) return;

      const source = event.source as unknown as Window | null;
      const reply = (payload: Record<string, unknown>) => {
        try {
          source?.postMessage(payload, "*");
        } catch {
          // frame may be gone
        }
      };

      const key = String(data.key ?? "").slice(0, 100);
      const storageKey = `vc_share_${id}_${key}`;

      if (data.type === "storage-get") {
        let value: unknown = null;
        try {
          const raw = localStorage.getItem(storageKey);
          value = raw ? JSON.parse(raw) : null;
        } catch {
          value = null;
        }
        reply({ type: "storage-result", id: data.id, value });
      } else if (data.type === "storage-set") {
        try {
          localStorage.setItem(storageKey, JSON.stringify(data.value));
        } catch {
          // quota or private mode
        }
        reply({ type: "storage-result", id: data.id, value: true });
      } else if (data.type === "storage-remove") {
        try {
          localStorage.removeItem(storageKey);
        } catch {
          // ignore
        }
        reply({ type: "storage-result", id: data.id, value: true });
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [id]);

  return (
    <div className="flex h-dvh flex-col bg-[#07080b]">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-line px-4">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-accent/30 bg-accent/10">
          <ShieldCheck className="h-3.5 w-3.5 text-accent" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-xs font-medium text-ink">{name}</div>
          <div className="text-[9.5px] text-muted">
            由 VibeCheck 生成 · 通过质量门禁后交付
          </div>
        </div>
        <Link
          href="/"
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel2 px-2.5 py-1.5 text-[10px] text-muted transition hover:border-line2 hover:text-ink"
        >
          <ArrowLeft className="h-3 w-3" />
          用 VibeCheck 创建你的应用
        </Link>
      </header>
      <div className="min-h-0 flex-1 bg-white">
        <iframe
          title={name}
          srcDoc={srcDoc}
          sandbox="allow-scripts allow-forms"
          className="h-full w-full bg-white"
        />
      </div>
    </div>
  );
}
