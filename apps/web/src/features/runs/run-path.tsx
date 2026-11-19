import type { RunDetail } from "@kipivo/contracts/runs";
import { useState } from "react";
import modules from "./run-modules.svg?no-inline";

function RouteSegment({ path, active }: { path: string; active: boolean }) {
  return (
    <g>
      <path d={path} fill="none" stroke="#555850" strokeWidth="2" />
      {active && (
        <>
          <path
            className="motion-safe:animate-run-draw motion-safe:[animation-delay:var(--run-delay,0s)] motion-safe:[stroke-dasharray:1]"
            d={path}
            pathLength="1"
            fill="none"
            stroke="#d8a161"
            strokeWidth="2"
          />
          <circle
            className="opacity-0 motion-safe:animate-run-travel motion-safe:[animation-delay:var(--run-delay,0s)]"
            r="4"
            fill="#ffd281"
            style={{ offsetPath: `path("${path}")` }}
          />
        </>
      )}
    </g>
  );
}

export function RunPath({ status, exitCode }: Pick<RunDetail, "status" | "exitCode">) {
  const [replay, setReplay] = useState(0);
  const finished = status === "succeeded" || status === "failed";
  const output =
    exitCode !== null ? `Exit ${exitCode}` : finished ? "No exit code" : "Awaiting output";
  return (
    <figure className="border-t border-plate-border bg-[#1c1d1a] bg-[radial-gradient(#d9d4bc12_0.8px,transparent_1px)] bg-size-[12px_12px] px-3 pt-1 pb-4 font-mono text-xs/[1.4] text-[#e0ded5]">
      <figcaption className="flex min-h-7 items-center justify-between gap-2 px-1">
        <span>Run path</span>
        <button
          type="button"
          className="min-h-9 cursor-pointer rounded-control px-2 font-sans text-[13px]/4.5 font-medium text-[#d1cec3]
            hover:bg-[#34362f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-plate
            motion-reduce:hidden pointer-coarse:min-h-11"
          aria-label="Replay run path"
          onClick={() => setReplay(replay + 1)}
        >
          Replay
        </button>
      </figcaption>
      <svg
        className="block h-auto w-full"
        key={replay}
        viewBox="0 64 800 126"
        width="800"
        height="126"
        aria-hidden="true"
      >
        <RouteSegment active path="M177 151H215Q231 151 246 141L262 131Q277 121 293 121H350" />
        <g className="[--run-delay:1.8s]">
          <RouteSegment
            active={finished}
            path="M449 121H507Q524 121 540 131L556 141Q571 151 587 151H624"
          />
        </g>
        <use href={modules + "#request"} />
        <use href={modules + "#runner"} />
        <g className="motion-safe:animate-run-lift">
          <use href={modules + "#runner-lid"} />
        </g>
        <use href={modules + "#output"} opacity={finished ? 1 : 0.4} />
      </svg>
      <ol className="mt-0.5 grid grid-cols-3 text-center font-sans text-xs/[1.4] font-medium">
        <li>Request</li>
        <li>Local runner</li>
        <li>{output}</li>
      </ol>
    </figure>
  );
}
