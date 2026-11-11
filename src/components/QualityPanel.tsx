"use client";

import {
  AlertTriangle,
  ArrowDownToLine,
  Check,
  Copy,
  Download,
  FileCode2,
  Loader2,
  Minus,
  ShieldCheck,
  ShieldX,
  Timer,
  Wrench,
  X,
} from "lucide-react";
import { useState } from "react";
import { reportToMarkdown } from "@/lib/quality";
import type { AppSpec, Finding, QualityReport } from "@/lib/types";
import { cn, formatMs } from "@/lib/utils";

function ScoreRing({ score, passed }: { score: number; passed: boolean }) {
  const r = 32;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(100, score)) / 100);
  const color = passed ? "#34d399" : score >= 60 ? "#fbbf24" : "#fb7185";
  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg viewBox="0 0 80 80" className="h-24 w-24 -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#1c202a" strokeWidth="6" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold tabular-nums">{score}</span>
        <span className="text-[10px] text-muted">/ 100</span>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: "pass" | "fail" | "warn" | "skip" }) {
  if (status === "pass") {
    return (
      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent/15">
        <Check className="h-3 w-3 text-accent" />
      </span>
    );
  }
  if (status === "fail") {
    return (
      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-danger/15">
        <X className="h-3 w-3 text-danger" />
      </span>
    );
  }
  if (status === "warn") {
    return (
      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-warn/15">
        <AlertTriangle className="h-2.5 w-2.5 text-warn" />
      </span>
    );
  }
  return (
    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-line2">
      <Minus className="h-3 w-3 text-muted" />
    </span>
  );
}

function FindingRow({ finding }: { finding: Finding }) {
  const status = finding.status;
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <StatusIcon status={status} />
      <div className="min-w-0">
        <div className={cn("text-xs", status === "fail" ? "text-ink" : "text-muted")}>
          {finding.label}
        </div>
        {finding.detail && (
          <div className="mt-0.5 break-words text-[11px] leading-relaxed text-faint">
            {finding.detail}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-panel p-4">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {subtitle && <span className="text-[11px] text-faint">{subtitle}</span>}
      </div>
      {children}
    </section>
  );
}

export function QualityPanel({
  report,
  spec,
  onRepair,
  repairing = false,
  onExportHtml,
  onExportSpec,
  onExportReport,
}: {
  report: QualityReport | null;
  spec: AppSpec | null;
  onRepair?: () => void;
  repairing?: boolean;
  onExportHtml: () => void;
  onExportSpec: () => void;
  onExportReport: () => void;
}) {
  const [copied, setCopied] = useState(false);

  if (!report) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-panel">
          <ShieldCheck className="h-5 w-5 text-faint" />
        </div>
        <p className="text-sm text-muted">还没有质量报告</p>
        <p className="max-w-xs text-xs leading-relaxed text-faint">
          生成一个应用，或打开一个预置模板。Agent 会自动生成验收标准、在沙箱中执行，并给出质量分。
        </p>
      </div>
    );
  }

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(reportToMarkdown(report, spec));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard unavailable
    }
  };

  const rows = [
    { label: "运行时", value: report.breakdown.runtime, max: 30, color: "bg-emerald-400" },
    { label: "验收通过率", value: report.breakdown.acceptance, max: 40, color: "bg-sky-400" },
    { label: "可访问性", value: report.breakdown.a11y, max: 15, color: "bg-violet-400" },
    { label: "韧性", value: report.breakdown.resilience, max: 15, color: "bg-amber-400" },
  ];

  const passCount = report.checkResults.filter((r) => r.status === "pass").length;
  const failed = report.checkResults.filter((r) => r.status === "fail");

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-3xl space-y-3 p-4 sm:p-6">
        <section className="rounded-2xl border border-line bg-panel p-5">
          <div className="flex items-center gap-5">
            <ScoreRing score={report.score} passed={report.passed} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {report.passed ? (
                  <ShieldCheck className="h-4 w-4 text-accent" />
                ) : (
                  <ShieldX className="h-4 w-4 text-danger" />
                )}
                <h2 className="text-base font-semibold">
                  {report.passed ? "质量门禁通过" : "已阻止交付"}
                </h2>
              </div>
              <p className="mt-1 text-[11px] text-muted">
                放行标准：总分 ≥ 80 且零运行时错误
              </p>
              {spec && (
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted">
                  {spec.summary}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full border border-line bg-panel2 px-2 py-0.5 text-[10px] text-muted">
                  <Timer className="mr-1 inline h-2.5 w-2.5" />
                  {formatMs(report.durationMs)}
                </span>
                <span className="rounded-full border border-line bg-panel2 px-2 py-0.5 text-[10px] text-muted">
                  {passCount}/{report.checkResults.length} 项通过
                </span>
                {report.timedOut && (
                  <span className="rounded-full border border-warn/30 bg-warn/10 px-2 py-0.5 text-[10px] text-warn">
                    验收超时
                  </span>
                )}
              </div>
              {!report.passed && onRepair && (
                <button
                  onClick={onRepair}
                  disabled={repairing}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-warn/30 bg-warn/10 px-2.5 py-1.5 text-[11px] font-medium text-warn transition hover:bg-warn/15 disabled:cursor-wait disabled:opacity-60"
                >
                  {repairing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Wrench className="h-3.5 w-3.5" />
                  )}
                  {repairing ? "修复中…" : "继续修复"}
                </button>
              )}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {rows.map((row) => (
              <div key={row.label}>
                <div className="mb-1 flex items-center justify-between text-[10px]">
                  <span className="text-muted">{row.label}</span>
                  <span className="tabular-nums text-faint">
                    {row.value}/{row.max}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-panel2">
                  <div
                    className={cn("h-full rounded-full transition-all duration-700", row.color)}
                    style={{ width: `${Math.max(2, (row.value / row.max) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <Section title="验收用例" subtitle="由需求自动生成，在沙箱中逐条执行">
          <div className="divide-y divide-line/60">
            {report.checkResults.map((r) => (
              <div key={r.id} className="flex items-start gap-2.5 py-2">
                <StatusIcon status={r.status} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs text-ink">{r.description}</span>
                    <span className="shrink-0 text-[10px] tabular-nums text-faint">
                      {r.status === "pass" ? "PASS" : r.status === "fail" ? "FAIL" : "SKIP"}
                      {typeof r.durationMs === "number" ? ` · ${r.durationMs}ms` : ""}
                    </span>
                  </div>
                  {r.detail && (
                    <div className="mt-0.5 break-words text-[11px] leading-relaxed text-faint">
                      {r.detail}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          {failed.length > 0 && (
            <p className="mt-2 rounded-lg border border-danger/20 bg-danger/5 px-2.5 py-2 text-[11px] leading-relaxed text-danger/90">
              {failed.length} 条验收未通过，质量门禁已阻止交付。点击上方「继续修复」带着失败报告再修一次，或在对话中补充更具体的约束。
            </p>
          )}
        </Section>

        {report.runtimeIssues.length > 0 && (
          <Section title="运行时错误" subtitle="来自沙箱内的真实执行">
            <div className="space-y-1.5">
              {report.runtimeIssues.slice(0, 8).map((issue, i) => (
                <div
                  key={`${issue.type}-${i}`}
                  className="rounded-lg border border-danger/20 bg-danger/5 px-2.5 py-1.5"
                >
                  <div className="text-[10px] uppercase tracking-wide text-danger/80">
                    {issue.type}
                  </div>
                  <div className="mt-0.5 break-words font-mono text-[11px] leading-relaxed text-ink/90">
                    {issue.message}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        <Section title="可访问性" subtitle="表单 / 图片 / 按钮可访问名">
          {report.a11y.length === 0 ? (
            <div className="flex items-center gap-2 py-1 text-xs text-muted">
              <StatusIcon status="pass" />
              未发现可访问性问题
            </div>
          ) : (
            <div className="divide-y divide-line/60">
              {report.a11y.map((f, i) => (
                <FindingRow key={`${f.id}-${i}`} finding={f} />
              ))}
            </div>
          )}
        </Section>

        <Section title="静态检查" subtitle="生成物契约 / 持久化 / 体积 / 依赖">
          <div className="divide-y divide-line/60">
            {report.statics.map((f) => (
              <FindingRow key={f.id} finding={f} />
            ))}
          </div>
        </Section>

        <section className="rounded-2xl border border-line bg-panel p-4">
          <h3 className="mb-2 text-sm font-semibold">把质量带出 Demo</h3>
          <p className="mb-3 text-[11px] leading-relaxed text-faint">
            导出的 Playwright 用例可以直接放进 CI，作为这个应用的回归测试。
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onExportHtml}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel2 px-2.5 py-1.5 text-[11px] text-ink transition hover:border-line2 hover:bg-[#151922]"
            >
              <Download className="h-3.5 w-3.5" />
              导出 HTML
            </button>
            <button
              onClick={onExportSpec}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel2 px-2.5 py-1.5 text-[11px] text-ink transition hover:border-line2 hover:bg-[#151922]"
            >
              <FileCode2 className="h-3.5 w-3.5" />
              导出 Playwright 用例
            </button>
            <button
              onClick={onExportReport}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel2 px-2.5 py-1.5 text-[11px] text-muted transition hover:border-line2 hover:bg-[#151922] hover:text-ink"
            >
              <ArrowDownToLine className="h-3.5 w-3.5" />
              导出报告 JSON
            </button>
            <button
              onClick={copyReport}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel2 px-2.5 py-1.5 text-[11px] text-muted transition hover:border-line2 hover:bg-[#151922] hover:text-ink"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-accent" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? "已复制" : "复制报告摘要"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
