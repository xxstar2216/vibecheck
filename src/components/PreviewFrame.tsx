"use client";

import { useMemo } from "react";
import { buildSrcDoc } from "@/lib/quality";
import type { TestRequest } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PreviewFrame({
  code,
  device,
  reloadKey,
}: {
  code: string;
  device: "desktop" | "mobile";
  reloadKey: number;
}) {
  const srcDoc = useMemo(() => buildSrcDoc(code, null), [code]);
  return (
    <div className="h-full w-full overflow-auto p-3 sm:p-5">
      <div
        className={cn(
          "mx-auto h-full transition-all duration-300",
          device === "mobile" ? "w-[390px] max-w-full" : "w-full",
        )}
      >
        <div className="h-full overflow-hidden rounded-xl border border-line bg-white shadow-[0_24px_90px_-24px_rgba(0,0,0,0.85)]">
          <iframe
            key={`${reloadKey}-${srcDoc.length}`}
            title="应用预览"
            srcDoc={srcDoc}
            sandbox="allow-scripts allow-forms"
            className="h-full w-full bg-white"
          />
        </div>
      </div>
    </div>
  );
}

export function TestRunnerFrame({ request }: { request: TestRequest | null }) {
  const srcDoc = useMemo(
    () =>
      request
        ? buildSrcDoc(request.code, { runId: request.runId, checks: request.checks })
        : "",
    [request],
  );
  if (!request) return null;
  return (
    <iframe
      key={request.runId}
      title="测试执行器"
      aria-hidden="true"
      tabIndex={-1}
      srcDoc={srcDoc}
      sandbox="allow-scripts allow-forms"
      style={{
        position: "fixed",
        left: -10000,
        top: 0,
        width: 1024,
        height: 768,
        opacity: 0,
        pointerEvents: "none",
      }}
    />
  );
}
