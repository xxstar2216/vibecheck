"use client";

import { Cloud, HardDrive, LogIn, Plus, ShieldCheck, Trash2 } from "lucide-react";
import Link from "next/link";
import type { Project } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";

export function Sidebar({
  projects,
  currentId,
  onSelect,
  onNew,
  onDelete,
  signedIn,
}: {
  projects: Project[];
  currentId: string | null;
  onSelect: (project: Project) => void;
  onNew: () => void;
  onDelete: (project: Project) => void;
  signedIn: boolean;
}) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-panel/30 lg:flex">
      <div className="p-3">
        <button
          onClick={onNew}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-accent/25 bg-accent/10 px-3 py-2 text-xs font-medium text-accent transition hover:bg-accent/15"
        >
          <Plus className="h-3.5 w-3.5" />
          新建应用
        </button>
      </div>

      <div className="px-3 pb-2 pt-1 text-[10px] uppercase tracking-widest text-faint">
        最近项目
      </div>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto scrollbar-thin px-2 pb-3">
        {projects.length === 0 && (
          <p className="px-2 py-3 text-[11px] leading-relaxed text-faint">
            {signedIn
              ? "还没有项目。生成一个应用，或打开右侧模板；项目会保存到云端。"
              : "还没有项目。生成一个应用，或打开右侧模板；访客模式保存在本机，登录后可云端保存。"}
          </p>
        )}
        {projects.map((p) => {
          const current =
            p.versions.find((v) => v.id === p.currentVersionId) ?? p.versions[p.versions.length - 1];
          const score = current?.report?.score;
          const active = p.id === currentId;
          return (
            <div
              key={p.id}
              className={cn(
                "group relative flex items-center gap-1 rounded-lg pr-1 transition",
                active ? "bg-panel2" : "hover:bg-panel2/70",
              )}
            >
              <button
                onClick={() => onSelect(p)}
                className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left"
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-[10px]",
                    active
                      ? "border-accent/30 bg-accent/10 text-accent"
                      : "border-line bg-panel text-muted",
                  )}
                >
                  {p.name.slice(0, 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block truncate text-xs",
                      active ? "text-ink" : "text-muted group-hover:text-ink",
                    )}
                  >
                    {p.name}
                  </span>
                  <span className="block text-[10px] text-faint">
                    {p.versions.length} 个版本 · {timeAgo(p.updatedAt)}
                  </span>
                </span>
                {typeof score === "number" && (
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] tabular-nums",
                      score >= 80
                        ? "border-accent/25 bg-accent/10 text-accent"
                        : "border-danger/25 bg-danger/10 text-danger",
                    )}
                  >
                    {score}
                  </span>
                )}
              </button>
              <button
                onClick={() => onDelete(p)}
                aria-label={`删除项目 ${p.name}`}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-faint opacity-0 transition hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="border-t border-line p-3 text-[10px] leading-relaxed text-faint">
        <div className="flex items-center gap-1.5 text-muted">
          <ShieldCheck className="h-3 w-3 text-accent" />
          质量门禁 ≥ 80 才放行
        </div>
        <div className="mt-1.5 flex items-start gap-1">
          {signedIn ? (
            <Cloud className="mt-0.5 h-3 w-3 shrink-0 text-accent" />
          ) : (
            <HardDrive className="mt-0.5 h-3 w-3 shrink-0 text-faint" />
          )}
          <p>
            {signedIn
              ? "已登录：项目保存到云端 SQLite，换设备或重新登录都能恢复。"
              : "访客模式：项目仅保存在本机浏览器。登录后可云端保存，换设备继续。"}
          </p>
        </div>
        {!signedIn && (
          <Link
            href="/login"
            className="mt-2 inline-flex items-center gap-1 text-accent transition hover:underline"
          >
            <LogIn className="h-3 w-3" /> 登录 / 注册，开启云端保存
          </Link>
        )}
      </div>
    </aside>
  );
}
