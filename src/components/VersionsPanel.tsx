"use client";

import { CheckCircle2, History, Pencil, Sparkles, Wrench, XCircle } from "lucide-react";
import type { Project, Version, VersionSource } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";

const SOURCE: Record<
  VersionSource,
  { label: string; icon: typeof Sparkles; className: string }
> = {
  generate: { label: "生成", icon: Sparkles, className: "text-accent" },
  edit: { label: "修改", icon: Pencil, className: "text-sky-400" },
  repair: { label: "自动修复", icon: Wrench, className: "text-warn" },
  template: { label: "模板", icon: History, className: "text-muted" },
};

export function VersionsPanel({
  project,
  onSelect,
}: {
  project: Project | null;
  onSelect: (version: Version) => void;
}) {
  if (!project || project.versions.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-panel">
          <History className="h-5 w-5 text-faint" />
        </div>
        <p className="text-sm text-muted">还没有版本</p>
        <p className="max-w-xs text-xs leading-relaxed text-faint">
          每次生成、修改或自动修复都会留下一个版本，可以随时回看代码与质量报告。
        </p>
      </div>
    );
  }

  const versions = [...project.versions].sort((a, b) => b.index - a.index);

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-2xl space-y-2 p-4 sm:p-6">
        {versions.map((v) => {
          const meta = SOURCE[v.source];
          const Icon = meta.icon;
          const current = v.id === project.currentVersionId;
          return (
            <button
              key={v.id}
              onClick={() => onSelect(v)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition",
                current
                  ? "border-accent/30 bg-accent/[0.06]"
                  : "border-line bg-panel hover:border-line2 hover:bg-panel2",
              )}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-panel2 font-mono text-[11px] text-muted">
                v{v.index}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={cn("inline-flex items-center gap-1 text-[11px]", meta.className)}>
                    <Icon className="h-3 w-3" />
                    {meta.label}
                  </span>
                  {current && (
                    <span className="rounded-full border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[9px] text-accent">
                      当前
                    </span>
                  )}
                  <span className="text-[10px] text-faint">{timeAgo(v.createdAt)}</span>
                </div>
                <div className="mt-0.5 truncate text-xs text-ink/90">
                  {v.note || v.spec.summary}
                </div>
                <div className="mt-1 flex items-center gap-2 text-[10px] text-faint">
                  <span>{v.spec.checks.length} 条验收</span>
                  <span>·</span>
                  <span>{(new TextEncoder().encode(v.code).length / 1024).toFixed(1)}KB</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {v.report ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px]",
                      v.report.passed
                        ? "border-accent/25 bg-accent/10 text-accent"
                        : "border-danger/25 bg-danger/10 text-danger",
                    )}
                  >
                    {v.report.passed ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <XCircle className="h-3 w-3" />
                    )}
                    {v.report.score}
                  </span>
                ) : (
                  <span className="text-[10px] text-faint">无报告</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
