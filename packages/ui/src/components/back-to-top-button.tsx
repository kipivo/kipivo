import { RocketIcon } from "@kipivo/icons";
import { useState } from "react";
import { cn } from "../lib/utils";
import { Button } from "./button";

interface BackToTopButtonProps {
  visible?: boolean;
  label?: string;
  className?: string;
  onClick: () => void;
}

export function BackToTopButton({
  visible = true,
  label = "Back to top",
  className,
  onClick,
}: BackToTopButtonProps) {
  const [launching, setLaunching] = useState(false);
  return (
    <div className={cn("pointer-events-none relative size-11", className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={label}
        title={label}
        inert={!visible || launching}
        aria-hidden={!visible || launching}
        className="pointer-events-auto size-11 rounded-full bg-card text-primary shadow-sm hover:text-primary inert:opacity-0 motion-safe:transition-[opacity,translate,background-color,color] motion-safe:duration-200 motion-safe:ease-out motion-safe:inert:translate-y-2 dark:bg-card dark:hover:bg-muted"
        onClick={() => {
          setLaunching(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
          onClick();
        }}
      >
        <RocketIcon
          strokeWidth={1.8}
          aria-hidden="true"
          className="size-5 motion-safe:transition-transform motion-safe:group-hover/button:translate-x-0.5 motion-safe:group-hover/button:-translate-y-0.5"
          visibility={launching ? "hidden" : undefined}
        />
      </Button>
      {launching && (
        <span
          aria-hidden="true"
          className="absolute inset-0 m-auto size-5 animate-rocket-launch text-primary
            before:absolute before:top-[78%] before:left-[12%] before:h-4 before:w-[3px]
            before:origin-top before:rotate-45 before:rounded-[50%]
            before:bg-[linear-gradient(var(--primary),var(--chart-2)_35%,transparent)]
            motion-reduce:invisible motion-reduce:[animation-duration:1ms]"
          onAnimationEnd={() => setLaunching(false)}
        >
          <RocketIcon strokeWidth={1.8} className="size-full" />
        </span>
      )}
    </div>
  );
}
