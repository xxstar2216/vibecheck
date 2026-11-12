"use client";

import {
  AlertTriangle,
  ArrowUp,
  Check,
  Circle,
  KeyRound,
  Loader2,
  Minus,
  Sparkles,
  Square,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DEMO_APPS, type DemoApp } from "@/lib/demoApps";
import type { AppSpec, ChatMessage, TraceStatus, TraceStep } from "@/lib/types";
import { cn } from "@/lib/utils";

function TraceIcon({ status }: { status: TraceStatus }) {
  if (status === "running") {
    return <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-accent" />;
  }
  if (status === "done") {
    return (
      <span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-accent/15">
        <Check className="h-2.5 w-2.5 text-accent" />
      </span>
    );
  }
  if (status === "fail") {
    return (
      <span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-danger/15">
        <X className="h-2.5 w-2.5 text-danger" />
      </span>
    );
  }
  if (status === "skip") {
    return (
      <span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-line2">
        <Minus className="h-2.5 w-2.5 text-muted" />
      </span>
    );
  }
  return <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-line2" />;
}

export function ChatPanel({
  className,
  messages,
  trace,
  phase,
  error,
  configured,
  prompt,
  onPromptChange,
  onSubmit,
  onStop,
  onTemplate,
  onDismissError,
  hasProject,
  pendingSpec,
  onConfirmSpec,
  onCancelSpec,
  suggestions,
  onSuggestion,
}: {
  className?: string;
  messages: ChatMessage[];
  trace: TraceStep[];
  phase: "idle" | "working";
  error: string | null;
  configured: boolean | null;
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  onTemplate: (demo: DemoApp) => void;
  onDismissError: () => void;
  hasProject: boolean;
  pendingSpec: AppSpec | null;
  onConfirmSpec: () => void;
  onCancelSpec: () => void;
  suggestions: string[];
  onSuggestion: (text: string) => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, trace, error]);

  useEffect(() => {
    if (phase !== "working") {
      setElapsed(0);
      return;
    }
    const started = Date.now();
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - started) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  return (
    <section className={cn("flex min-h-0 flex-col bg-panel/20", className)}>
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-line px-3">
        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-accent/10">
          <Sparkles className="h-3 w-3 text-accent" />
        </span>
        <span className="text-xs font-medium">Agent Team</span>
        <span className="hidden text-[10px] text-faint sm:inline">Spec → Build → QA → Gate</span>
        <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] text-muted">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              phase === "working" ? "bg-accent pulse-dot" : "bg-faint",
            )}
          />
          {phase === "working" ? "执行中" : "就绪"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1 border-b border-line px-3 py-1.5">
        {[
          ["Spec", "PM", "bg-accent"],
          ["Build", "Eng", "bg-sky-400"],
          ["QA", "Test", "bg-violet-400"],
          ["Gate", "Release", "bg-warn"],
        ].map(([role, label, color]) => (
          <span
            key={role}
            className="inline-flex items-center gap-1 rounded-full border border-line bg-panel2 px-1.5 py-0.5 text-[9px] text-muted"
          >
            <span className={cn("h-1 w-1 rounded-full", color)} />
            {role} · {label}
          </span>
        ))}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto scrollbar-thin p-3">
        {trace.length > 0 && (
          <div className="animate-rise rounded-xl border border-line bg-panel p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase tracking-widest text-faint">
                Agent Trace
              </span>
              {phase === "working" && (
                <span className="shrink-0 text-[10px] tabular-nums text-faint">
                  已用 {elapsed}s{elapsed < 90 ? " · 预计 60-90s" : ""}
                </span>
              )}
            </div>
            <div className="space-y-2.5">
              {trace.map((step) => (
                <div key={step.id} className="flex items-start gap-2">
                  <TraceIcon status={step.status} />
                  <div className="min-w-0">
                    <div
                      className={cn(
                        "text-[11px] leading-relaxed",
                        step.status === "pending" ? "text-faint" : "text-ink/90",
                      )}
                    >
                      {step.label}
                    </div>
                    {step.detail && (
                      <div className="mt-0.5 break-words text-[10px] leading-relaxed text-faint">
                        {step.detail}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "animate-rise",
              m.role === "user" ? "flex justify-end" : "flex justify-start",
            )}
          >
            <div
              className={cn(
                "max-w-[92%] rounded-xl border px-3 py-2 text-[11.5px] leading-relaxed whitespace-pre-wrap",
                m.role === "user"
                  ? "border-accent/20 bg-accent/[0.08] text-ink/95"
                  : "border-line bg-panel text-muted",
              )}
            >
              {m.text}
            </div>
          </div>
        ))}

        {messages.length === 0 && trace.length === 0 && (
          <div className="space-y-3">
            <div className="rounded-xl border border-line bg-panel p-3">
              <p className="text-[11px] font-medium text-ink/90">从模板开始</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {DEMO_APPS.map((demo) => (
                  <button
                    key={demo.id}
                    onClick={() => onTemplate(demo)}
                    className="rounded-full border border-line bg-panel2 px-2.5 py-1 text-[10px] text-muted transition hover:border-accent/30 hover:text-accent"
                  >
                    {demo.title}
                  </button>
                ))}
              </div>
            </div>
            <p className="px-1 text-[10.5px] leading-relaxed text-faint">
              描述一个应用。Agent 会先生成可执行的验收标准，再写代码，最后在隔离沙箱里逐条自测；不达标会自动修复一次。
            </p>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {pendingSpec && (
        <div className="animate-rise mx-3 mb-2 rounded-xl border border-accent/25 bg-accent/[0.05] p-3">
          <div className="flex items-center gap-1.5 text-[10px] text-accent">
            <Sparkles className="h-3 w-3" />
            Spec Agent · 等待确认
          </div>
          <div className="mt-1 text-xs font-medium text-ink">{pendingSpec.name}</div>
          <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted">
            {pendingSpec.summary}
          </p>
          <div className="mt-2 space-y-1">
            {pendingSpec.checks.map((check) => (
              <div
                key={check.id}
                className="flex items-start gap-1.5 text-[10.5px] leading-relaxed text-ink/85"
              >
                <Check className="mt-0.5 h-2.5 w-2.5 shrink-0 text-accent" />
                <span>{check.description}</span>
              </div>
            ))}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <button
              onClick={onConfirmSpec}
              className="rounded-lg bg-accent px-2.5 py-1.5 text-[10.5px] font-semibold text-[#06231a] transition hover:brightness-105"
            >
              确认并生成代码
            </button>
            <button
              onClick={onCancelSpec}
              className="rounded-lg border border-line bg-panel2 px-2.5 py-1.5 text-[10.5px] text-muted transition hover:text-ink"
            >
              修改需求
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mx-3 mb-2 flex items-start gap-2 rounded-lg border border-danger/25 bg-danger/[0.07] px-2.5 py-2">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-danger" />
          <p className="min-w-0 flex-1 break-words text-[10.5px] leading-relaxed text-danger/95">
            {error}
          </p>
          <button
            onClick={onDismissError}
            aria-label="关闭提示"
            className="shrink-0 text-danger/60 transition hover:text-danger"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {configured === false && (
        <div className="mx-3 mb-2 flex items-start gap-2 rounded-lg border border-warn/20 bg-warn/[0.06] px-2.5 py-2">
          <KeyRound className="mt-0.5 h-3 w-3 shrink-0 text-warn" />
          <p className="text-[10.5px] leading-relaxed text-warn/90">
            未配置 LLM_API_KEY。你仍然可以打开上方模板，体验完整的生成后验收与质量报告。配置方式见 README。
          </p>
        </div>
      )}

      {phase === "idle" && suggestions.length > 0 && !pendingSpec && (
        <div className="flex flex-wrap gap-1 px-3 pb-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => onSuggestion(suggestion)}
              className="rounded-full border border-line bg-panel2 px-2 py-1 text-[10px] text-muted transition hover:border-accent/30 hover:text-accent"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <div className="shrink-0 border-t border-line p-3">
        <textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              if (phase !== "working") onSubmit();
            }
          }}
          rows={2}
          placeholder={
            hasProject
              ? "继续修改当前应用，例如：增加筛选，并保持数据持久化…"
              : "描述你想做的应用，例如：一个支持筛选和持久化的待办清单…"
          }
          className="w-full resize-none rounded-xl border border-line bg-panel px-3 py-2.5 text-[11.5px] leading-relaxed text-ink outline-none transition placeholder:text-faint focus:border-accent/40 focus:ring-2 focus:ring-accent/10"
        />
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[10px] text-faint">⌘/Ctrl + Enter 发送</span>
          <div className="ml-auto">
            {phase === "working" ? (
              <button
                onClick={onStop}
                className="inline-flex items-center gap-1.5 rounded-lg border border-danger/30 bg-danger/10 px-3 py-1.5 text-[11px] font-medium text-danger transition hover:bg-danger/15"
              >
                <Square className="h-3 w-3" />
                停止
              </button>
            ) : (
              <button
                onClick={onSubmit}
                disabled={!prompt.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[11px] font-semibold text-[#06231a] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowUp className="h-3 w-3" />
                生成
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
