import { cn } from "cn";

export interface WordmarkProps {
  logo: string;
  name: string;
  variant?: "plain" | "framed";
}

export function Wordmark({ logo, name, variant = "plain" }: WordmarkProps) {
  const framed = variant === "framed";

  return (
    <div
      className={cn(
        "flex items-center text-xl leading-[normal] font-[650]",
        framed ? "gap-2" : "gap-3",
      )}
    >
      <img
        src={logo}
        alt=""
        width={36}
        height={36}
        className={cn(framed && "shrink-0 rounded-lg border border-border bg-muted/60 p-0.5")}
      />
      <span data-slot="wordmark-name">{name}</span>
    </div>
  );
}
