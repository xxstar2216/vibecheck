"use client";

import { ArrowLeft, Loader2, Lock, Mail, ShieldCheck, Sparkles, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";

type Mode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, login, register, logout, refresh } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "请求失败，请重试。");
    } finally {
      setSubmitting(false);
    }
  }

  async function demoLogin() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/demo", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(data.message || "演示账号登录失败，请重试。");
      }
      await refresh();
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "演示账号登录失败，请重试。");
    } finally {
      setSubmitting(false);
    }
  }

  if (!loading && user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg px-4">
        <div className="w-full max-w-sm rounded-2xl border border-line bg-panel p-6 text-center">
          <ShieldCheck className="mx-auto h-8 w-8 text-accent" />
          <h1 className="mt-3 text-lg font-semibold">已登录</h1>
          <p className="mt-1 text-xs text-muted">
            {user.name} · {user.email}
          </p>
          <div className="mt-5 flex gap-2">
            <button
              onClick={() => router.push("/")}
              className="flex-1 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-[#06231a]"
            >
              回到工作台
            </button>
            <button
              onClick={async () => {
                await logout();
                router.refresh();
              }}
              className="rounded-lg border border-line bg-panel2 px-3 py-2 text-xs text-muted hover:text-ink"
            >
              退出登录
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-bg px-4 py-10">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-60" />
      <div className="relative w-full max-w-md">
        <Link
          href="/"
          className="mb-5 inline-flex items-center gap-1.5 text-[11px] text-muted transition hover:text-ink"
        >
          <ArrowLeft className="h-3 w-3" />
          先以访客身份体验
        </Link>

        <div className="rounded-2xl border border-line bg-panel/95 p-6 shadow-[0_30px_120px_-40px_rgba(0,0,0,0.9)] backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent/30 bg-accent/10">
              <ShieldCheck className="h-4 w-4 text-accent" />
            </span>
            <div>
              <div className="text-base font-semibold tracking-tight">VibeCheck</div>
              <div className="text-[10px] text-muted">生成 · 验收 · 交付</div>
            </div>
          </div>

          <h1 className="mt-5 text-xl font-semibold tracking-tight">
            {mode === "login" ? "登录工作台" : "创建账号"}
          </h1>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            登录后项目保存到云端，换设备也能继续；访客模式的数据只存在本机。
          </p>

          <div className="mt-4 flex rounded-lg border border-line bg-panel2 p-0.5 text-[11px]">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError(null);
                }}
                className={`flex-1 rounded-md px-3 py-1.5 transition ${
                  mode === m ? "bg-panel text-ink" : "text-muted hover:text-ink"
                }`}
              >
                {m === "login" ? "登录" : "注册"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-4 space-y-3">
            {mode === "register" && (
              <label className="block">
                <span className="mb-1 block text-[10px] text-muted">昵称（可选）</span>
                <div className="flex items-center gap-2 rounded-lg border border-line bg-panel2 px-3">
                  <User className="h-3.5 w-3.5 text-faint" />
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="nickname"
                    placeholder="怎么称呼你"
                    className="h-10 w-full bg-transparent text-xs text-ink outline-none placeholder:text-faint"
                  />
                </div>
              </label>
            )}

            <label className="block">
              <span className="mb-1 block text-[10px] text-muted">邮箱</span>
              <div className="flex items-center gap-2 rounded-lg border border-line bg-panel2 px-3">
                <Mail className="h-3.5 w-3.5 text-faint" />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="h-10 w-full bg-transparent text-xs text-ink outline-none placeholder:text-faint"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1 block text-[10px] text-muted">
                密码{mode === "register" ? "（至少 8 位）" : ""}
              </span>
              <div className="flex items-center gap-2 rounded-lg border border-line bg-panel2 px-3">
                <Lock className="h-3.5 w-3.5 text-faint" />
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  required
                  minLength={mode === "register" ? 8 : 1}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  placeholder="••••••••"
                  className="h-10 w-full bg-transparent text-xs text-ink outline-none placeholder:text-faint"
                />
              </div>
            </label>

            {error && (
              <p className="rounded-lg border border-danger/25 bg-danger/[0.07] px-3 py-2 text-[11px] text-danger">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-accent text-xs font-semibold text-[#06231a] transition hover:brightness-105 disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {mode === "login" ? "登录" : "注册并进入"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => void demoLogin()}
            disabled={submitting}
            className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-accent/25 bg-accent/5 text-[11px] text-accent transition hover:bg-accent/10 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            使用演示账号（自动登录，体验云端保存）
          </button>
          <p className="mt-1.5 text-center text-[10px] text-faint">
            演示账号：demo@vibecheck.dev / demo1234
          </p>

          <p className="mt-4 text-center text-[10px] leading-relaxed text-faint">
            访客可直接体验全部生成与质量门禁能力；登录后项目保存到云端。
          </p>
        </div>
      </div>
    </div>
  );
}
