import { cn } from "cn";
import type { ComponentProps } from "react";

export function Page({ className, ...props }: ComponentProps<"main">) {
  return <main className={cn("page-gutter py-12 sm:py-16", className)} {...props} />;
}

export function PageTitle({
  scale = "page",
  className,
  ...props
}: ComponentProps<"h1"> & {
  scale?: "page" | "display";
}) {
  return (
    <h1
      className={cn(
        "font-heading font-bold text-balance",
        scale === "display"
          ? "max-w-[12ch] text-[clamp(3.25rem,9vw,7.5rem)] leading-[0.98] tracking-[-0.065em]"
          : "text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.05] tracking-[-0.045em]",
        className,
      )}
      {...props}
    />
  );
}
