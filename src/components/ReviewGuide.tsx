"use client";

import {
  Bot,
  Cloud,
  Code2,
  Compass,
  Eye,
  Palette,
  Share2,
  UserPlus,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ReviewTab = "preview" | "quality" | "code" | "versions";

interface ReviewGuideProps {
  open: boolean;
  signedIn: boolean;
  hasProject: boolean;
  onClose: () => void;
  onLogin: () => void;
  onNew: () => void;
  onTab: (tab: ReviewTab) => void;
  onShare: () => void;
  onMobile: () => void;
}

function Action({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-line bg-panel px-2 py-1 text-[10.5px] text-muted transition",
        disabled
          ? "cursor-not-allowed opacity-40"
          : "hover:border-accent/40 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function Step({
  index,
  icon: Icon,
  title,
  description,
  children,
}: {
  index: number;
  icon: typeof Compass;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-panel2/40 p-3">
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-accent/25 bg-accent/10 text-[9px] font-semibold text-accent">
          {index}
        </span>
        <Icon className="h-3.5 w-3.5 text-accent" />
        <span className="text-xs font-medium">{title}</span>
      </div>
      <p className="mt-1.5 text-[10.5px] leading-relaxed text-muted">{description}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

export function ReviewGuide({
  open,
  signedIn,
  hasProject,
  onClose,
  onLogin,
  onNew,
  onTab,
  onShare,
  onMobile,
}: ReviewGuideProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="3 分钟评审导览"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-line bg-panel p-6 shadow-[0_30px_120px_-30px_rgba(0,0,0,0.9)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Compass className="h-4 w-4 text-accent" />
              3 分钟评审导览
            </div>
            <p className="mt-1 text-[11px] text-muted">
              按六项评分逐条体验；每一步都有入口，走完即可看到可验证的证据。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭评审导览"
            className="rounded-md p-1.5 text-faint transition hover:bg-panel2 hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Step
            index={1}
            icon={UserPlus}
            title="注册登录"
            description="右上角「登录 / 注册」；登录页可一键使用演示账号。登录后项目保存到云端。"
          >
            {signedIn ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-accent/25 bg-accent/10 px-2 py-1 text-[10.5px] text-accent">
                <Cloud className="h-3 w-3" /> 已登录 · 云端保存
              </span>
            ) : (
              <Action onClick={onLogin}>去登录 / 注册</Action>
            )}
          </Step>

          <Step
            index={2}
            icon={Bot}
            title="Agent 交互"
            description="新建应用并输入需求；Spec Agent 给出验收标准，确认后 Build / QA / Gate 依次执行。"
          >
            <Action onClick={onNew}>新建应用</Action>
          </Step>

          <Step
            index={3}
            icon={Cloud}
            title="数据持久化"
            description="登录后生成项目，刷新页面或退出重登；项目会从服务端 SQLite 恢复。"
          >
            {signedIn ? (
              <Action onClick={() => onTab("preview")}>打开预览</Action>
            ) : (
              <Action onClick={onLogin}>先登录</Action>
            )}
          </Step>

          <Step
            index={4}
            icon={Palette}
            title="页面美观度"
            description="预览页可切换桌面 / 手机宽度；3 个模板覆盖待办、打卡、记账等常见场景。"
          >
            <Action onClick={onMobile}>切换手机宽度</Action>
          </Step>

          <Step
            index={5}
            icon={Code2}
            title="代码管理"
            description="代码页在线编辑并重新验收；版本页查看 diff / 回滚；代码页可下载 ZIP。"
          >
            <Action onClick={() => onTab("code")}>打开代码</Action>
            <Action onClick={() => onTab("versions")}>打开版本</Action>
          </Step>

          <Step
            index={6}
            icon={Eye}
            title="产物预览"
            description="预览页支持分享页、二维码、新标签和全屏；分享后可复制链接。"
          >
            <Action onClick={() => onTab("preview")}>打开预览</Action>
            <Action onClick={onShare} disabled={!hasProject}>
              <Share2 className="h-3 w-3" /> 分享
            </Action>
          </Step>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-line bg-panel2/40 px-3 py-2.5">
          <span className="text-[10px] leading-relaxed text-faint">
            {signedIn
              ? "已登录：项目保存到云端，换设备或重新登录都能恢复。"
              : "访客模式：可直接体验；登录或使用演示账号后开启云端保存。"}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-[11px] font-semibold text-[#06231a] transition hover:brightness-105"
          >
            开始体验
          </button>
        </div>
      </div>
    </div>
  );
}
