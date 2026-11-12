"use client";

import Link from "next/link";
import {
  ArrowRight,
  ChevronRight,
  Cloud,
  Code2,
  Compass,
  ExternalLink,
  Eye,
  HardDrive,
  History,
  Loader2,
  LogIn,
  LogOut,
  Maximize2,
  Minimize2,
  Monitor,
  Play,
  Plus,
  RefreshCw,
  Share2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthProvider";
import { ChatPanel } from "./ChatPanel";
import { CodePanel } from "./CodePanel";
import { PreviewFrame, TestRunnerFrame } from "./PreviewFrame";
import { QualityPanel } from "./QualityPanel";
import { ReviewGuide } from "./ReviewGuide";
import { ShareModal } from "./ShareModal";
import { Sidebar } from "./Sidebar";
import { VersionsPanel } from "./VersionsPanel";
import { DEMO_APPS, type DemoApp } from "@/lib/demoApps";
import { buildReport, cleanGeneratedCode, toPlaywright } from "@/lib/quality";
import {
  deleteProject,
  getAppValue,
  listLocalProjects,
  listProjects,
  removeAppValue,
  saveProject,
  setAppValue,
  setServerMode,
} from "@/lib/storage";
import type {
  AcceptanceCheck,
  AppSpec,
  ChatMessage,
  CheckResult,
  Finding,
  Project,
  QualityReport,
  RuntimeIssue,
  TestOutcome,
  TestRequest,
  TraceStep,
  Version,
} from "@/lib/types";
import { cn, download, safeFilename, uid } from "@/lib/utils";

type Tab = "preview" | "quality" | "code" | "versions";
type Device = "desktop" | "mobile";
type Phase = "idle" | "working";

async function streamText(
  url: string,
  payload: unknown,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
  if (!res.ok) {
    let message = `请求失败 (${res.status})`;
    try {
      const data = (await res.json()) as { message?: string; error?: string };
      message = data.message || data.error || message;
    } catch {
      // keep default
    }
    throw new Error(message);
  }
  if (!res.body) throw new Error("模型没有返回内容");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
    onChunk(text);
  }
  return text;
}

function summarizeFailures(report: QualityReport): string {
  const lines: string[] = [];
  const failed = report.checkResults.filter((r) => r.status === "fail");
  if (failed.length) {
    lines.push(
      "未通过的验收项：\n" +
        failed.map((f) => `- ${f.description}: ${f.detail || "失败"}`).join("\n"),
    );
  }
  if (report.runtimeIssues.length) {
    lines.push(
      "运行时错误：\n" +
        report.runtimeIssues
          .slice(0, 5)
          .map((e) => `- [${e.type}] ${e.message}`)
          .join("\n"),
    );
  }
  if (report.timedOut) lines.push("验收执行超时。");
  const staticIssues = report.statics.filter(
    (f) => f.status === "fail" || f.status === "warn",
  );
  if (staticIssues.length) {
    lines.push(
      "静态检查问题：\n" +
        staticIssues.map((f) => `- ${f.label}${f.detail ? `：${f.detail}` : ""}`).join("\n"),
    );
  }
  return lines.join("\n\n") || "质量分未达标。";
}

function Landing({ onTemplate }: { onTemplate: (demo: DemoApp) => void }) {
  return (
    <div className="relative h-full overflow-y-auto scrollbar-thin">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-60" />
      <div className="relative mx-auto flex min-h-full max-w-3xl flex-col justify-center px-5 py-8">
        <div className="animate-rise">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/[0.07] px-2.5 py-1 text-[10px] text-accent">
            <Sparkles className="h-3 w-3" /> AI Native · Quality Gate
          </span>
          <h1 className="mt-4 text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
            让 AI 生成的应用，
            <br className="hidden sm:block" />
            先过质量门禁。
          </h1>
          <p className="mt-3 max-w-xl text-xs leading-relaxed text-muted sm:text-sm">
            VibeCheck 把验收标准前置到生成流程：先生成可执行用例，再写代码，再在隔离沙箱里逐条自测。失败自动修复一次，通过才交付。
          </p>
        </div>

        <div className="mt-6 grid gap-2 sm:grid-cols-3">
          {DEMO_APPS.map((demo) => (
            <button
              key={demo.id}
              onClick={() => onTemplate(demo)}
              className="group rounded-xl border border-line bg-panel/80 p-3 text-left transition hover:border-accent/30 hover:bg-panel2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-ink">{demo.title}</span>
                <ArrowRight className="h-3 w-3 text-faint transition group-hover:translate-x-0.5 group-hover:text-accent" />
              </div>
              <p className="mt-1.5 text-[10.5px] leading-relaxed text-faint">{demo.tagline}</p>
              <div className="mt-2 flex items-center gap-1 text-[9.5px] text-accent/80">
                <Play className="h-2.5 w-2.5" /> 一键运行并验收
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-faint">
          <span className="inline-flex items-center gap-1.5">
            <span className="flex h-4 w-4 items-center justify-center rounded-full border border-line bg-panel text-[8px]">
              1
            </span>
            描述应用
          </span>
          <ChevronRight className="h-3 w-3 text-line2" />
          <span className="inline-flex items-center gap-1.5">
            <span className="flex h-4 w-4 items-center justify-center rounded-full border border-line bg-panel text-[8px]">
              2
            </span>
            生成 + 自动验收
          </span>
          <ChevronRight className="h-3 w-3 text-line2" />
          <span className="inline-flex items-center gap-1.5">
            <span className="flex h-4 w-4 items-center justify-center rounded-full border border-line bg-panel text-[8px]">
              3
            </span>
            质量报告 + 交付
          </span>
        </div>
      </div>
    </div>
  );
}

function GeneratingSkeleton() {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-3 flex items-center gap-2 text-[11px] text-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
          Agent 正在生成并验收…
        </div>
        <div className="h-36 rounded-xl shimmer" />
        <div className="mt-3 h-3 w-3/4 rounded shimmer" />
        <div className="mt-2 h-3 w-1/2 rounded shimmer" />
        <p className="mt-4 text-[10px] leading-relaxed text-faint">
          真实模型通常需要 60-90 秒，请保持页面打开。代码会流式生成，完成后自动注入测试探针并执行验收。
        </p>
      </div>
    </div>
  );
}

export function Workspace() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [version, setVersion] = useState<Version | null>(null);
  const [tab, setTab] = useState<Tab>("preview");
  const [device, setDevice] = useState<Device>("desktop");
  const [reloadKey, setReloadKey] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [trace, setTrace] = useState<TraceStep[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [prompt, setPrompt] = useState("");
  const [streamCode, setStreamCode] = useState("");
  const [previewCode, setPreviewCode] = useState("");
  const [testRequest, setTestRequest] = useState<TestRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [repairing, setRepairing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [pendingSpec, setPendingSpec] = useState<AppSpec | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const { user, loading: authLoading, logout } = useAuth();

  const pendingTests = useRef(new Map<string, (outcome: TestOutcome) => void>());
  const activeProjectId = useRef<string | null>(null);
  const runningRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const abortedRef = useRef(false);
  const specResolver = useRef<(() => void) | null>(null);
  const specPromptRef = useRef("");

  const patchTrace = useCallback((id: string, patch: Partial<TraceStep>) => {
    setTrace((current) => current.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const loadProject = useCallback((p: Project) => {
    setProject(p);
    activeProjectId.current = p.id;
    setPendingSpec(null);
    specResolver.current = null;
    setShareOpen(false);
    setFullscreen(false);
    const v =
      p.versions.find((x) => x.id === p.currentVersionId) ??
      p.versions[p.versions.length - 1] ??
      null;
    setVersion(v);
    setStreamCode(v?.code ?? "");
    setPreviewCode(v?.code ?? "");
    setTestRequest(null);
    setError(null);
    setTrace([]);
    setPhase("idle");
    setTab("preview");
    setSuggestions(
      v ? ["增加筛选功能", "换成深色主题", "加一个统计卡片"] : [],
    );
    setMessages(
      v
        ? [
            {
              role: "assistant",
              text: `已载入「${p.name}」v${v.index}${v.report ? `，质量分 ${v.report.score}/100` : ""}。你可以继续对话修改。`,
            },
          ]
        : [],
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health")
      .then((r) => r.json())
      .then((d: { configured?: boolean; model?: string | null }) => {
        if (cancelled) return;
        setConfigured(Boolean(d.configured));
        setModel(d.model ?? null);
      })
      .catch(() => {
        if (!cancelled) setConfigured(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (authLoading) return;
    setServerMode(Boolean(user));
    let cancelled = false;
    listProjects()
      .then((ps) => {
        if (cancelled) return;
        setProjects(ps);
        if (ps.length > 0) {
          loadProject(ps[0]);
        } else {
          setProject(null);
          setVersion(null);
          setStreamCode("");
          setPreviewCode("");
          setMessages([]);
          setTrace([]);
          setError(null);
          setTab("preview");
          setPhase("idle");
          activeProjectId.current = null;
        }
      })
      .catch(() => {
        if (!cancelled) setProjects([]);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, loadProject]);

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
      const type = data.type;
      const key = String(data.key ?? "").slice(0, 100);

      if (type === "storage-get") {
        const pid = activeProjectId.current;
        const value = pid ? await getAppValue(pid, key) : null;
        reply({ type: "storage-result", id: data.id, value: value ?? null });
      } else if (type === "storage-set") {
        const pid = activeProjectId.current;
        if (pid) await setAppValue(pid, key, data.value);
        reply({ type: "storage-result", id: data.id, value: true });
      } else if (type === "storage-remove") {
        const pid = activeProjectId.current;
        if (pid) await removeAppValue(pid, key);
        reply({ type: "storage-result", id: data.id, value: true });
      } else if (type === "atoms-tests-complete") {
        const runId = String(data.runId ?? "");
        const resolve = pendingTests.current.get(runId);
        if (!resolve) return;
        pendingTests.current.delete(runId);
        resolve({
          results: Array.isArray(data.results) ? (data.results as CheckResult[]) : [],
          a11y: Array.isArray(data.a11y) ? (data.a11y as Finding[]) : [],
          errors: Array.isArray(data.errors) ? (data.errors as RuntimeIssue[]) : [],
        });
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const refreshProjects = useCallback(async () => {
    const ps = await listProjects();
    setProjects(ps);
  }, []);

  const persist = useCallback(async (p: Project) => {
    await saveProject(p);
    const ps = await listProjects();
    setProjects(ps);
  }, []);

  const handleNew = useCallback(() => {
    if (runningRef.current) return;
    setProject(null);
    setVersion(null);
    setStreamCode("");
    setPreviewCode("");
    setTestRequest(null);
    setMessages([]);
    setTrace([]);
    setError(null);
    setTab("preview");
    setPhase("idle");
    setPrompt("");
    setPendingSpec(null);
    setSuggestions([]);
    setShareOpen(false);
    setFullscreen(false);
    specResolver.current = null;
    activeProjectId.current = null;
  }, []);

  const handleDelete = useCallback(
    async (p: Project) => {
      if (runningRef.current) return;
      if (!window.confirm(`删除「${p.name}」？数据会一并清除。`)) return;
      await deleteProject(p.id);
      if (project?.id === p.id) handleNew();
      await refreshProjects();
    },
    [project, handleNew, refreshProjects],
  );

  const handleImportLocal = useCallback(async () => {
    if (!user || runningRef.current) return;
    const locals = await listLocalProjects();
    if (locals.length === 0) {
      setError("没有本地访客项目可导入。");
      return;
    }
    setServerMode(true);
    try {
      for (const localProject of locals) {
        await saveProject(localProject);
      }
      await refreshProjects();
      setMessages((m) => [
        ...m,
        { role: "assistant", text: `已导入 ${locals.length} 个本地项目到账号。` },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "导入本地项目失败。");
    }
  }, [user, refreshProjects]);

  const runTests = useCallback(
    (code: string, checks: AcceptanceCheck[]): Promise<TestOutcome> => {
      const runId = uid();
      setTestRequest({ runId, code, checks });
      return new Promise<TestOutcome>((resolve) => {
        const timer = window.setTimeout(() => {
          pendingTests.current.delete(runId);
          setTestRequest(null);
          resolve({ results: [], a11y: [], errors: [], timedOut: true });
        }, 20000);
        pendingTests.current.set(runId, (outcome) => {
          window.clearTimeout(timer);
          setTestRequest(null);
          resolve(outcome);
        });
      });
    },
    [],
  );

  const evaluate = useCallback(
    async (code: string, spec: AppSpec) => {
      const t0 = performance.now();
      const outcome = await runTests(code, spec.checks);
      return buildReport({
        code,
        spec,
        outcome,
        durationMs: Math.round(performance.now() - t0),
      });
    },
    [runTests],
  );

  const run = useCallback(
    async (rawPrompt: string, edit: boolean) => {
      if (runningRef.current) return;
      const text = rawPrompt.trim();
      if (!text) return;
      if (configured === false) {
        setError(
          "服务端未配置 LLM_API_KEY。你仍然可以打开预置模板，体验完整的质量门禁。",
        );
        return;
      }

      runningRef.current = true;
      abortedRef.current = false;
      setPhase("working");
      setError(null);
      setTestRequest(null);
      setStreamCode("");
      setPreviewCode("");
      setTrace([
        {
          id: "spec",
          label: edit ? "Spec Agent · 产品经理（回归）" : "Spec Agent · 产品经理",
          status: "running",
        },
        { id: "code", label: "Build Agent · 工程师", status: "pending" },
        { id: "test", label: "QA Agent · 测试", status: "pending" },
        { id: "gate", label: "Gate · 发布", status: "pending" },
      ]);
      setMessages((m) => [...m, { role: "user", text }]);
      setTab("preview");

      const abort = new AbortController();
      abortRef.current = abort;

      try {
        const ensureActive = () => {
          if (abortedRef.current) {
            const error = new Error("Aborted");
            error.name = "AbortError";
            throw error;
          }
        };

        let spec: AppSpec;
        let base: Version | null = edit ? version : null;

        if (edit && base) {
          spec = base.spec;
          patchTrace("spec", {
            status: "done",
            detail: `${spec.checks.length} 条验收标准（回归）`,
          });
        } else {
          const res = await fetch("/api/spec", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: text }),
            signal: abort.signal,
          });
          if (!res.ok) {
            const data = (await res.json().catch(() => ({}))) as {
              message?: string;
              error?: string;
            };
            throw new Error(data.message || data.error || `规格生成失败 (${res.status})`);
          }
          const data = (await res.json()) as { spec: AppSpec };
          spec = data.spec;
          base = null;
          specPromptRef.current = text;
          patchTrace("spec", {
            status: "done",
            detail: `${spec.checks.length} 条验收标准 · 等待确认`,
          });
          setPendingSpec(spec);
          setMessages((m) => [
            ...m,
            {
              role: "assistant",
              text: `我先拆了 ${spec.checks.length} 条验收标准，确认后开始写代码。`,
            },
          ]);
          await new Promise<void>((resolve) => {
            specResolver.current = resolve;
          });
          specResolver.current = null;
          setPendingSpec(null);
          ensureActive();
          patchTrace("spec", {
            status: "done",
            detail: `${spec.checks.length} 条验收标准 · 已确认`,
          });
        }
        ensureActive();

        let working: Project =
          edit && project
            ? project
            : {
                id: uid(),
                name: spec.name,
                prompt: text,
                versions: [],
                currentVersionId: "",
                createdAt: Date.now(),
                updatedAt: Date.now(),
              };
        if (edit && project) working = project;
        activeProjectId.current = working.id;

        patchTrace("code", { status: "running" });
        let last = 0;
        const onChunk = (chunk: string) => {
          const now = Date.now();
          if (now - last > 80) {
            last = now;
            setStreamCode(chunk);
          }
        };

        const raw = await streamText(
          "/api/generate",
          edit && base
            ? { prompt: text, spec, previousCode: base.code, mode: "edit" }
            : { prompt: text, spec },
          onChunk,
          abort.signal,
        );
        ensureActive();
        let finalCode = cleanGeneratedCode(raw);
        if (!finalCode || !/<html[\s>]/i.test(finalCode)) {
          throw new Error("模型没有返回完整的 HTML，请重试或换一个模型。");
        }
        setStreamCode(finalCode);
        setPreviewCode(finalCode);
        patchTrace("code", {
          status: "done",
          detail: `${(new TextEncoder().encode(finalCode).length / 1024).toFixed(1)}KB · 流式生成完成`,
        });

        patchTrace("test", { status: "running" });
        let report = await evaluate(finalCode, spec);
        ensureActive();
        let repaired = false;

        if (!report.passed) {
          patchTrace("test", {
            status: "done",
            detail: `${report.score}/100 · 发现问题，准备自动修复`,
          });
          patchTrace("gate", { status: "running", detail: "触发一次自动修复" });
          try {
            const repairedRaw = await streamText(
              "/api/repair",
              { code: finalCode, spec, failures: summarizeFailures(report) },
              onChunk,
              abort.signal,
            );
            ensureActive();
            const fixed = cleanGeneratedCode(repairedRaw);
            if (fixed && /<html[\s>]/i.test(fixed)) {
              finalCode = fixed;
              repaired = true;
              setStreamCode(fixed);
              setPreviewCode(fixed);
              patchTrace("gate", {
                status: "running",
                detail: "修复完成，重新验收",
              });
              report = await evaluate(fixed, spec);
              ensureActive();
            }
          } catch (repairError) {
            if ((repairError as { name?: string })?.name === "AbortError") throw repairError;
            patchTrace("gate", {
              status: "fail",
              detail: "自动修复失败，保留当前版本",
            });
          }
        }

        patchTrace("test", {
          status: "done",
          detail: `${report.checkResults.filter((r) => r.status === "pass").length}/${report.checkResults.length} 项通过 · ${report.durationMs}ms`,
        });
        patchTrace("gate", {
          status: report.passed ? "done" : "fail",
          detail: report.passed
            ? `质量分 ${report.score}，放行`
            : `质量分 ${report.score}，已阻止交付`,
        });
        ensureActive();

        const index = (working.versions[working.versions.length - 1]?.index ?? 0) + 1;
        const newVersion: Version = {
          id: uid(),
          index,
          code: finalCode,
          spec,
          report,
          createdAt: Date.now(),
          source: repaired ? "repair" : edit ? "edit" : "generate",
          note: edit ? text : undefined,
        };
        const updated: Project = {
          ...working,
          name: working.versions.length ? working.name : spec.name,
          prompt: working.versions.length ? working.prompt : text,
          versions: [...working.versions, newVersion],
          currentVersionId: newVersion.id,
          updatedAt: Date.now(),
        };
        setProject(updated);
        setVersion(newVersion);
        setStreamCode(finalCode);
        setPreviewCode(finalCode);
        await persist(updated);
        setTab("quality");
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            text: report.passed
              ? `「${spec.name}」已生成并通过质量门禁：${report.score}/100。${report.checkResults.length} 项验收中 ${report.checkResults.filter((r) => r.status === "pass").length} 项通过${repaired ? "，自动修复 1 次" : ""}。`
              : `「${spec.name}」未通过质量门禁：${report.score}/100。已保留版本与失败证据，可以继续对话修复，或查看质量报告。`,
          },
        ]);
        setSuggestions(
          report.passed
            ? ["增加筛选功能", "换成深色主题", "加一个统计卡片"]
            : ["简化功能，先保证通过", "继续修复所有未通过项"],
        );
      } catch (err) {
        const name = (err as { name?: string })?.name;
        if (name === "AbortError") {
          setTrace((t) =>
            t.map((s) =>
              s.status === "running" ? { ...s, status: "skip", detail: "已停止" } : s,
            ),
          );
          setMessages((m) => [...m, { role: "assistant", text: "已停止本次生成。" }]);
        } else {
          const message = err instanceof Error ? err.message : String(err);
          setError(message);
          setMessages((m) => [...m, { role: "assistant", text: `生成失败：${message}` }]);
          setTrace((t) =>
            t.map((s) => (s.status === "running" ? { ...s, status: "fail" } : s)),
          );
        }
      } finally {
        runningRef.current = false;
        setPhase("idle");
        abortRef.current = null;
      }
    },
    [configured, evaluate, patchTrace, persist, project, version],
  );

  const handleContinueRepair = useCallback(async () => {
    if (runningRef.current) return;
    if (!project || !version || !version.report || version.report.passed) return;
    if (configured === false) {
      setError("服务端未配置 LLM_API_KEY，无法继续修复。");
      return;
    }

    const currentProject = project;
    const baseVersion = version;
    const baseReport = version.report;

    runningRef.current = true;
    abortedRef.current = false;
    setRepairing(true);
    setPhase("working");
    setError(null);
    setTrace([
      { id: "repair", label: "QA Agent · 根据失败报告修复", status: "running" },
      { id: "test", label: "QA Agent · 重新验收", status: "pending" },
      { id: "gate", label: "Gate · 发布", status: "pending" },
    ]);
    setMessages((m) => [...m, { role: "user", text: "继续修复所有未通过项" }]);
    setTab("quality");

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const ensureActive = () => {
        if (abortedRef.current) {
          const error = new Error("Aborted");
          error.name = "AbortError";
          throw error;
        }
      };

      let last = 0;
      const onChunk = (chunk: string) => {
        const now = Date.now();
        if (now - last > 80) {
          last = now;
          setStreamCode(chunk);
        }
      };

      const raw = await streamText(
        "/api/repair",
        {
          code: baseVersion.code,
          spec: baseVersion.spec,
          failures: summarizeFailures(baseReport),
        },
        onChunk,
        abort.signal,
      );
      ensureActive();
      const fixed = cleanGeneratedCode(raw);
      if (!fixed || !/<html[\s>]/i.test(fixed)) {
        throw new Error("模型没有返回完整的 HTML，请稍后再试。");
      }
      setStreamCode(fixed);
      setPreviewCode(fixed);
      patchTrace("repair", {
        status: "done",
        detail: `${(new TextEncoder().encode(fixed).length / 1024).toFixed(1)}KB · 修复完成`,
      });

      patchTrace("test", { status: "running" });
      const report = await evaluate(fixed, baseVersion.spec);
      ensureActive();

      patchTrace("test", {
        status: "done",
        detail: `${report.checkResults.filter((r) => r.status === "pass").length}/${report.checkResults.length} 项通过 · ${report.durationMs}ms`,
      });
      patchTrace("gate", {
        status: report.passed ? "done" : "fail",
        detail: report.passed
          ? `质量分 ${report.score}，放行`
          : `质量分 ${report.score}，仍未通过`,
      });

      const index =
        (currentProject.versions[currentProject.versions.length - 1]?.index ?? 0) + 1;
      const newVersion: Version = {
        id: uid(),
        index,
        code: fixed,
        spec: baseVersion.spec,
        report,
        createdAt: Date.now(),
        source: "repair",
        note: "根据失败报告继续修复",
      };
      const updated: Project = {
        ...currentProject,
        versions: [...currentProject.versions, newVersion],
        currentVersionId: newVersion.id,
        updatedAt: Date.now(),
      };
      setProject(updated);
      setVersion(newVersion);
      setStreamCode(fixed);
      setPreviewCode(fixed);
      await persist(updated);
      setTab("quality");
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: report.passed
            ? `继续修复完成，v${newVersion.index} 通过质量门禁：${report.score}/100。`
            : `继续修复后仍未通过：${report.score}/100。可以再点一次「继续修复」，或在对话里补充更具体的约束。`,
        },
      ]);
      setSuggestions(
        report.passed
          ? ["增加筛选功能", "换成深色主题", "加一个统计卡片"]
          : ["简化功能，先保证通过", "继续修复所有未通过项"],
      );
    } catch (err) {
      const name = (err as { name?: string })?.name;
      if (name === "AbortError") {
        setTrace((t) =>
          t.map((s) =>
            s.status === "running" ? { ...s, status: "skip", detail: "已停止" } : s,
          ),
        );
        setMessages((m) => [...m, { role: "assistant", text: "已停止本次修复。" }]);
      } else {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setMessages((m) => [...m, { role: "assistant", text: `修复失败：${message}` }]);
        setTrace((t) =>
          t.map((s) => (s.status === "running" ? { ...s, status: "fail" } : s)),
        );
      }
    } finally {
      runningRef.current = false;
      setRepairing(false);
      setPhase("idle");
      abortRef.current = null;
    }
  }, [configured, evaluate, patchTrace, persist, project, version]);

  const handleSaveCode = useCallback(
    async (newCode: string) => {
      if (!project || !version || runningRef.current) return;
      if (!/<html[\s>]/i.test(newCode)) {
        const message = "代码需要是完整的 HTML 文档。";
        setError(message);
        throw new Error(message);
      }

      runningRef.current = true;
      setSavingEdit(true);
      setPhase("working");
      setError(null);
      setTrace([
        { id: "edit", label: "Build Agent · 手动修改", status: "running" },
        { id: "test", label: "QA Agent · 重新验收", status: "pending" },
        { id: "gate", label: "Gate · 发布", status: "pending" },
      ]);

      try {
        const report = await evaluate(newCode, version.spec);
        patchTrace("edit", { status: "done", detail: "代码已更新" });
        patchTrace("test", {
          status: "done",
          detail: `${report.checkResults.filter((r) => r.status === "pass").length}/${report.checkResults.length} 项通过`,
        });
        patchTrace("gate", {
          status: report.passed ? "done" : "fail",
          detail: `质量分 ${report.score}`,
        });

        const index =
          (project.versions[project.versions.length - 1]?.index ?? 0) + 1;
        const newVersion: Version = {
          id: uid(),
          index,
          code: newCode,
          spec: version.spec,
          report,
          createdAt: Date.now(),
          source: "edit",
          note: "手动编辑",
        };
        const updated: Project = {
          ...project,
          versions: [...project.versions, newVersion],
          currentVersionId: newVersion.id,
          updatedAt: Date.now(),
        };

        setProject(updated);
        setVersion(newVersion);
        setStreamCode(newCode);
        setPreviewCode(newCode);
        await persist(updated);
        setTab("quality");
        setSuggestions(
          report.passed
            ? ["增加筛选功能", "换成深色主题", "加一个统计卡片"]
            : ["简化功能，先保证通过", "继续修复所有未通过项"],
        );
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            text: `手动编辑已保存为 v${newVersion.index}，质量分 ${report.score}/100${
              report.passed ? "，通过门禁" : "，未通过门禁"
            }。`,
          },
        ]);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setTrace((t) =>
          t.map((s) => (s.status === "running" ? { ...s, status: "fail" } : s)),
        );
        throw err;
      } finally {
        runningRef.current = false;
        setSavingEdit(false);
        setPhase("idle");
      }
    },
    [project, version, evaluate, patchTrace, persist],
  );

  const loadTemplate = useCallback(
    async (demo: DemoApp) => {
      if (runningRef.current) return;
      runningRef.current = true;
      abortedRef.current = false;
      setPhase("working");
      setError(null);
      setTestRequest(null);
      setStreamCode(demo.code);
      setPreviewCode(demo.code);
      setTrace([
        { id: "template", label: `载入模板「${demo.title}」`, status: "running" },
        { id: "test", label: "QA Agent · 沙箱验收", status: "pending" },
        { id: "gate", label: "Gate · 发布", status: "pending" },
      ]);
      setMessages([{ role: "user", text: demo.prompt }]);
      setTab("preview");

      const proj: Project = {
        id: uid(),
        name: demo.spec.name,
        prompt: demo.prompt,
        versions: [],
        currentVersionId: "",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      activeProjectId.current = proj.id;

      try {
        patchTrace("template", {
          status: "done",
          detail: `${demo.spec.checks.length} 条验收标准`,
        });
        patchTrace("test", { status: "running" });
        const report = await evaluate(demo.code, demo.spec);
        if (abortedRef.current) {
          setTrace((t) =>
            t.map((s) =>
              s.status === "running" ? { ...s, status: "skip", detail: "已停止" } : s,
            ),
          );
          setMessages((m) => [...m, { role: "assistant", text: "已停止本次验收。" }]);
          return;
        }
        patchTrace("test", {
          status: "done",
          detail: `${report.checkResults.filter((r) => r.status === "pass").length}/${report.checkResults.length} 项通过`,
        });
        patchTrace("gate", {
          status: report.passed ? "done" : "fail",
          detail: `质量分 ${report.score}`,
        });
        const v: Version = {
          id: uid(),
          index: 1,
          code: demo.code,
          spec: demo.spec,
          report,
          createdAt: Date.now(),
          source: "template",
        };
        const updated: Project = {
          ...proj,
          versions: [v],
          currentVersionId: v.id,
          updatedAt: Date.now(),
        };
        setProject(updated);
        setVersion(v);
        await persist(updated);
        setTab("quality");
        setMessages([
          { role: "user", text: demo.prompt },
          {
            role: "assistant",
            text: report.passed
              ? `已载入「${demo.title}」并通过质量门禁：${report.score}/100。你可以继续对话修改它。`
              : `已载入「${demo.title}」，质量分 ${report.score}/100，未通过门禁。`,
          },
        ]);
        setSuggestions([
          "增加筛选功能",
          "换成深色主题",
          "加一个统计卡片",
        ]);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setTrace((t) =>
          t.map((s) => (s.status === "running" ? { ...s, status: "fail" } : s)),
        );
      } finally {
        runningRef.current = false;
        setPhase("idle");
      }
    },
    [evaluate, patchTrace, persist],
  );

  const handleSelectVersion = useCallback(
    async (v: Version) => {
      if (!project) return;
      const updated = { ...project, currentVersionId: v.id, updatedAt: Date.now() };
      setProject(updated);
      setVersion(v);
      setStreamCode(v.code);
      setPreviewCode(v.code);
      setTab("preview");
      setError(null);
      setMessages([
        {
          role: "assistant",
          text: `已切换到 v${v.index}${v.report ? `，质量分 ${v.report.score}/100` : ""}。`,
        },
      ]);
      await persist(updated);
    },
    [project, persist],
  );

  const handleSubmit = useCallback(() => {
    if (phase === "working") return;
    const text = prompt.trim();
    if (!text) return;
    setPrompt("");
    void run(text, Boolean(project && version));
  }, [phase, prompt, project, version, run]);

  const handleStop = useCallback(() => {
    abortedRef.current = true;
    abortRef.current?.abort();
    specResolver.current?.();
    specResolver.current = null;
    setPendingSpec(null);
    for (const [id, resolve] of Array.from(pendingTests.current.entries())) {
      pendingTests.current.delete(id);
      resolve({ results: [], a11y: [], errors: [], timedOut: true });
    }
    setTestRequest(null);
  }, []);

  const handleConfirmSpec = useCallback(() => {
    specResolver.current?.();
    specResolver.current = null;
  }, []);

  const handleCancelSpec = useCallback(() => {
    if (pendingSpec) setPrompt(specPromptRef.current);
    abortedRef.current = true;
    specResolver.current?.();
    specResolver.current = null;
    setPendingSpec(null);
  }, [pendingSpec]);

  const handleSuggestion = useCallback(
    (text: string) => {
      if (runningRef.current) return;
      void run(text, Boolean(project && version));
    },
    [run, project, version],
  );

  const viewedCode = previewCode || version?.code || "";
  const activeReport = version?.report ?? null;
  const activeSpec = version?.spec ?? null;
  const appName = project?.name || version?.spec.name || "app";

  const exportHtml = useCallback(() => {
    if (!viewedCode) return;
    download(`${safeFilename(appName)}.html`, viewedCode, "text/html;charset=utf-8");
  }, [viewedCode, appName]);

  const exportSpec = useCallback(() => {
    if (!activeSpec) return;
    download(
      `${safeFilename(appName)}.spec.ts`,
      toPlaywright(activeSpec),
      "text/typescript;charset=utf-8",
    );
  }, [activeSpec, appName]);

  const exportReport = useCallback(() => {
    if (!activeReport) return;
    download(
      `${safeFilename(appName)}-report.json`,
      JSON.stringify(
        { app: appName, version: version?.index, spec: activeSpec, report: activeReport },
        null,
        2,
      ),
      "application/json;charset=utf-8",
    );
  }, [activeReport, activeSpec, appName, version]);

  const versionIndex =
    project?.versions.findIndex((v) => v.id === version?.id) ?? -1;
  const previousCode =
    project && versionIndex > 0 ? project.versions[versionIndex - 1].code : null;

  const createShare = useCallback(async (): Promise<string | null> => {
    if (!viewedCode || sharing) return null;
    setSharing(true);
    setError(null);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: appName,
          code: viewedCode,
          spec: activeSpec,
          report: activeReport,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          message?: string;
          error?: string;
        };
        throw new Error(data.message || data.error || "分享失败");
      }
      const data = (await res.json()) as { id: string };
      const url = `${window.location.origin}/share/${data.id}`;
      setShareUrl(url);
      return url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "分享失败");
      return null;
    } finally {
      setSharing(false);
    }
  }, [viewedCode, appName, activeSpec, activeReport, sharing]);

  const handleShare = useCallback(async () => {
    const url = await createShare();
    if (url) setShareOpen(true);
  }, [createShare]);

  const handleOpenTab = useCallback(async () => {
    const popup = window.open("", "_blank");
    const url = await createShare();
    if (url && popup) popup.location.href = url;
    else if (popup) popup.close();
  }, [createShare]);

  const tabs = [
    { id: "preview" as const, label: "预览", icon: Eye },
    { id: "quality" as const, label: "质量报告", icon: ShieldCheck },
    { id: "code" as const, label: "代码", icon: Code2 },
    { id: "versions" as const, label: "版本", icon: History },
  ];

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-panel/60 px-4 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-accent/30 bg-accent/10">
            <ShieldCheck className="h-4 w-4 text-accent" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">VibeCheck</div>
            <div className="-mt-0.5 text-[9.5px] text-muted">生成 · 验收 · 交付</div>
          </div>
        </div>
        <div className="ml-2 hidden items-center gap-1.5 rounded-full border border-line bg-panel2 px-2 py-0.5 text-[10px] text-muted sm:flex">
          <Zap className="h-2.5 w-2.5 text-accent" /> Quality Gate
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            title="3 分钟评审导览"
            className="inline-flex items-center gap-1 rounded-lg border border-line bg-panel2 px-2 py-1.5 text-[10.5px] text-muted transition hover:border-accent/40 hover:text-ink"
          >
            <Compass className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">评审导览</span>
          </button>
          {authLoading ? (
            <span className="hidden items-center gap-1 text-[10px] text-faint sm:flex">
              账号…
            </span>
          ) : user ? (
            <div className="flex items-center gap-0.5">
              <span
                title="已登录：项目保存到云端"
                className="hidden max-w-[150px] items-center gap-1 truncate rounded-full border border-line bg-panel2 px-2 py-0.5 text-[10px] text-muted sm:flex"
              >
                <Cloud className="h-2.5 w-2.5 text-accent" />
                {user.name || user.email}
              </span>
              <button
                onClick={() => void handleImportLocal()}
                className="hidden rounded-md px-1.5 py-1 text-[10px] text-muted transition hover:text-ink sm:block"
                title="把本地访客项目导入账号"
              >
                导入本地
              </button>
              <button
                onClick={() => void logout()}
                aria-label="退出登录"
                className="rounded-md p-1.5 text-muted transition hover:text-ink"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span className="hidden items-center gap-1 rounded-full border border-line bg-panel2 px-2 py-0.5 text-[10px] text-muted sm:flex">
                <HardDrive className="h-2.5 w-2.5" /> 访客
              </span>
              <Link
                href="/login"
                title="登录后项目保存到云端，换设备可继续"
                className="inline-flex items-center gap-1 rounded-lg border border-accent/25 bg-accent/10 px-2.5 py-1.5 text-[11px] text-accent transition hover:bg-accent/15"
              >
                <LogIn className="h-3.5 w-3.5" />
                登录 / 注册
              </Link>
            </div>
          )}
          <span
            className={cn(
              "hidden max-w-[160px] items-center gap-1.5 truncate rounded-full border px-2 py-0.5 text-[10px] sm:flex",
              configured
                ? "border-accent/20 bg-accent/5 text-accent"
                : configured === false
                  ? "border-warn/20 bg-warn/5 text-warn"
                  : "border-line bg-panel2 text-muted",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 shrink-0 rounded-full",
                configured ? "bg-accent" : configured === false ? "bg-warn" : "bg-faint",
              )}
            />
            <span className="truncate">
              {configured ? model || "模型就绪" : configured === false ? "未配置模型" : "检查模型…"}
            </span>
          </span>
          <button
            onClick={handleNew}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel2 px-2.5 py-1.5 text-[11px] text-muted transition hover:border-line2 hover:text-ink"
          >
            <Plus className="h-3.5 w-3.5" /> 新建
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <Sidebar
          projects={projects}
          currentId={project?.id ?? null}
          onSelect={(p) => {
            if (!runningRef.current) loadProject(p);
          }}
          onNew={handleNew}
          onDelete={handleDelete}
          signedIn={Boolean(user)}
        />

        <ChatPanel
          className="h-[46vh] w-full shrink-0 border-b border-line lg:h-auto lg:w-[380px] lg:border-b-0 lg:border-r"
          messages={messages}
          trace={trace}
          phase={phase}
          error={error}
          configured={configured}
          prompt={prompt}
          onPromptChange={setPrompt}
          onSubmit={handleSubmit}
          onStop={handleStop}
          onTemplate={loadTemplate}
          onDismissError={() => setError(null)}
          hasProject={Boolean(project && version)}
          pendingSpec={pendingSpec}
          onConfirmSpec={handleConfirmSpec}
          onCancelSpec={handleCancelSpec}
          suggestions={suggestions}
          onSuggestion={handleSuggestion}
        />

        <main className="flex min-h-0 flex-1 flex-col">
          <div className="flex h-11 shrink-0 items-center gap-1 border-b border-line px-2">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] transition",
                    active
                      ? "bg-panel2 text-ink"
                      : "text-muted hover:bg-panel2/60 hover:text-ink",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                  {t.id === "quality" && activeReport && (
                    <span
                      className={cn(
                        "rounded-full border px-1.5 py-0.5 text-[9px] tabular-nums",
                        activeReport.passed
                          ? "border-accent/25 bg-accent/10 text-accent"
                          : "border-danger/25 bg-danger/10 text-danger",
                      )}
                    >
                      {activeReport.score}
                    </span>
                  )}
                </button>
              );
            })}

            {tab === "preview" && viewedCode && (
              <div className="ml-auto flex items-center gap-1.5">
                <div className="flex rounded-lg border border-line bg-panel2 p-0.5">
                  <button
                    onClick={() => setDevice("desktop")}
                    aria-label="桌面宽度"
                    className={cn(
                      "rounded-md p-1.5 transition",
                      device === "desktop"
                        ? "bg-panel text-ink"
                        : "text-faint hover:text-muted",
                    )}
                  >
                    <Monitor className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDevice("mobile")}
                    aria-label="手机宽度"
                    className={cn(
                      "rounded-md p-1.5 transition",
                      device === "mobile"
                        ? "bg-panel text-ink"
                        : "text-faint hover:text-muted",
                    )}
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button
                  onClick={() => setReloadKey((k) => k + 1)}
                  aria-label="刷新预览"
                  className="rounded-lg border border-line bg-panel2 p-1.5 text-faint transition hover:text-ink"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={handleShare}
                  disabled={sharing}
                  aria-label="分享预览"
                  title="生成分享链接 / 二维码"
                  className="inline-flex items-center gap-1 rounded-lg border border-line bg-panel2 px-2 py-1.5 text-[10.5px] text-faint transition hover:text-ink disabled:opacity-50"
                >
                  {sharing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Share2 className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">分享</span>
                </button>
                <button
                  onClick={handleOpenTab}
                  aria-label="新标签页打开"
                  className="rounded-lg border border-line bg-panel2 p-1.5 text-faint transition hover:text-ink"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setFullscreen(true)}
                  aria-label="全屏预览"
                  className="rounded-lg border border-line bg-panel2 p-1.5 text-faint transition hover:text-ink"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1">
            {tab === "preview" &&
              (viewedCode ? (
                <PreviewFrame code={viewedCode} device={device} reloadKey={reloadKey} />
              ) : phase === "working" ? (
                <GeneratingSkeleton />
              ) : (
                <Landing onTemplate={loadTemplate} />
              ))}

            {tab === "quality" && (
              <QualityPanel
                report={activeReport}
                spec={activeSpec}
                onRepair={handleContinueRepair}
                repairing={repairing}
                onExportHtml={exportHtml}
                onExportSpec={exportSpec}
                onExportReport={exportReport}
              />
            )}

            {tab === "code" && (
              <CodePanel
                code={streamCode || viewedCode}
                streaming={phase === "working"}
                appName={appName}
                spec={activeSpec}
                report={activeReport}
                previousCode={previousCode}
                saving={savingEdit}
                onSaveCode={handleSaveCode}
              />
            )}

            {tab === "versions" && (
              <VersionsPanel project={project} onSelect={handleSelectVersion} />
            )}
          </div>
        </main>
      </div>

      {fullscreen && viewedCode && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#07080b]">
          <div className="flex h-11 shrink-0 items-center gap-2 border-b border-line px-3">
            <ShieldCheck className="h-4 w-4 text-accent" />
            <span className="truncate text-xs text-muted">{appName} · 全屏预览</span>
            <button
              onClick={() => setFullscreen(false)}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel2 px-2.5 py-1.5 text-[11px] text-muted transition hover:text-ink"
            >
              <Minimize2 className="h-3.5 w-3.5" />
              退出全屏
            </button>
          </div>
          <div className="min-h-0 flex-1">
            <PreviewFrame code={viewedCode} device={device} reloadKey={reloadKey} />
          </div>
        </div>
      )}

      {shareOpen && shareUrl && (
        <ShareModal url={shareUrl} onClose={() => setShareOpen(false)} />
      )}

      <ReviewGuide
        open={guideOpen}
        signedIn={Boolean(user)}
        hasProject={Boolean(project)}
        onClose={() => setGuideOpen(false)}
        onLogin={() => {
          setGuideOpen(false);
          window.location.href = "/login";
        }}
        onNew={() => {
          setGuideOpen(false);
          handleNew();
        }}
        onTab={(nextTab) => {
          setGuideOpen(false);
          setTab(nextTab);
        }}
        onShare={() => {
          setGuideOpen(false);
          void handleShare();
        }}
        onMobile={() => {
          setGuideOpen(false);
          setTab("preview");
          setDevice("mobile");
        }}
      />

      <TestRunnerFrame request={testRequest} />
    </div>
  );
}
