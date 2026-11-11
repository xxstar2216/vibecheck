export type CheckKind =
  | "visible"
  | "click"
  | "input"
  | "expectVisible"
  | "expectText"
  | "expectStorage"
  | "noRuntimeErrors";

export interface AcceptanceCheck {
  id: string;
  description: string;
  kind: CheckKind;
  selector?: string;
  text?: string;
  value?: string;
  expect?: string;
  storageKey?: string;
}

export interface AppSpec {
  name: string;
  summary: string;
  features: string[];
  checks: AcceptanceCheck[];
}

export interface RuntimeIssue {
  type: "error" | "unhandledrejection" | "console" | string;
  message: string;
  at?: number;
}

export type FindingStatus = "pass" | "warn" | "fail";

export interface Finding {
  id: string;
  label: string;
  status: FindingStatus;
  detail?: string;
}

export interface CheckResult {
  id: string;
  description: string;
  kind: CheckKind;
  status: "pass" | "fail" | "skip";
  detail?: string;
  durationMs?: number;
}

export interface QualityReport {
  score: number;
  passed: boolean;
  breakdown: {
    runtime: number;
    acceptance: number;
    a11y: number;
    resilience: number;
  };
  checkResults: CheckResult[];
  runtimeIssues: RuntimeIssue[];
  a11y: Finding[];
  statics: Finding[];
  resilience: Finding[];
  durationMs: number;
  generatedAt: number;
  timedOut?: boolean;
}

export type VersionSource = "generate" | "edit" | "repair" | "template";

export interface Version {
  id: string;
  index: number;
  code: string;
  spec: AppSpec;
  report: QualityReport | null;
  createdAt: number;
  source: VersionSource;
  note?: string;
}

export interface Project {
  id: string;
  name: string;
  prompt: string;
  versions: Version[];
  currentVersionId: string;
  createdAt: number;
  updatedAt: number;
}

export type TraceStatus = "pending" | "running" | "done" | "fail" | "skip";

export interface TraceStep {
  id: string;
  label: string;
  status: TraceStatus;
  detail?: string;
}

export interface TestOutcome {
  results: CheckResult[];
  a11y: Finding[];
  errors: RuntimeIssue[];
  timedOut?: boolean;
}

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

export interface TestRequest {
  runId: string;
  code: string;
  checks: AcceptanceCheck[];
}
