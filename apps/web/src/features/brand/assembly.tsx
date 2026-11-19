import type { ComponentProps } from "react";

import assembly from "./motion/src/assembly.svg?no-inline";

// Browsers can reuse an SVG image when only its fragment changes.
const intro = `${assembly}${assembly.includes("?") ? "&" : "?"}motion=intro#intro`;

export function Assembly({ fetchPriority }: Pick<ComponentProps<"img">, "fetchPriority">) {
  return (
    <figure className="overflow-hidden rounded-xl border border-border bg-card">
      <picture>
        <source media="(prefers-reduced-motion: no-preference)" srcSet={intro} />
        <img
          src={assembly}
          fetchPriority={fetchPriority}
          width={560}
          height={388}
          alt=""
          className="block h-auto w-full"
        />
      </picture>
    </figure>
  );
}
