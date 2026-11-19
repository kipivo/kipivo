import { Label } from "@kipivo/ui/components/label";
import { useEffect, useId, useState } from "react";
import { CodeBlock, CopyButton } from "./copy-button";

const semanticTokens = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-hover",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "border",
  "input",
  "ring",
];
const chartTokens = [1, 2, 3, 4, 5].map((index) => `chart-${index}`);
const tokens = [...semanticTokens, ...chartTokens];
const surfaces = ["background", "card", "popover", "muted", "secondary", "accent", "primary"];

function readColors() {
  const style = getComputedStyle(document.documentElement);
  return Object.fromEntries(
    tokens.map((token) => [token, style.getPropertyValue(`--${token}`).trim()]),
  );
}

// Sample browser-composited sRGB, including translucent foreground tokens.
function contrast(foreground: string, background: string, page: string) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  function paint(color: string) {
    context!.fillStyle = color;
    context!.fillRect(0, 0, 1, 1);
    const [red, green, blue] = Array.from(context!.getImageData(0, 0, 1, 1).data).map((channel) => {
      const value = channel / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return red * 0.2126 + green * 0.7152 + blue * 0.0722;
  }
  paint("white");
  paint(page);
  const back = paint(background);
  const front = paint(foreground);
  return (Math.max(front, back) + 0.05) / (Math.min(front, back) + 0.05);
}

export function Palette() {
  const [colors, setColors] = useState(readColors);
  useEffect(() => {
    const update = () => setColors(readColors());
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });
    import.meta.hot?.on("vite:afterUpdate", update);
    return () => {
      observer.disconnect();
      import.meta.hot?.off("vite:afterUpdate", update);
    };
  }, []);

  return (
    <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-10">
      <ContrastChecker colors={colors} />
      <section aria-labelledby="semantic-heading">
        <h2 id="semantic-heading" className="text-lg font-semibold">
          Semantic colors
        </h2>
        <p className="mt-2 mb-5 text-sm text-muted-foreground">
          Values follow the selected theme. Copy a token to use its CSS declaration.
        </p>
        <dl className="grid gap-x-8 lg:grid-cols-2">
          {semanticTokens.map((token) => (
            <Token key={token} name={token} value={colors[token]} />
          ))}
        </dl>
      </section>
      <section aria-labelledby="chart-heading">
        <h2 id="chart-heading" className="mb-4 text-lg font-semibold">
          Chart palette
        </h2>
        <ul className="mb-3 grid grid-cols-5 gap-3" aria-label="Chart swatches">
          {chartTokens.map((token) => (
            <li key={token} className="grid gap-2 text-center">
              <span
                className="h-16 rounded-lg"
                style={{ background: `var(--${token})` }}
                aria-hidden="true"
              />
              <span className="font-mono text-xs text-muted-foreground">{token}</span>
            </li>
          ))}
        </ul>
        <dl className="grid gap-x-8 lg:grid-cols-2">
          {chartTokens.map((token) => (
            <Token key={token} name={token} value={colors[token]} />
          ))}
        </dl>
      </section>
      <section aria-labelledby="review-heading">
        <h2 id="review-heading" className="mb-3 text-lg font-semibold">
          Check both themes
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Use Light and Dark to compare each component. Check hover and keyboard focus, disabled and
          loading actions, and invalid fields. Decorative borders stay subtle; input borders and
          focus rings use stronger tokens.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          In light mode, small primary-colored text on muted or secondary needs a darker color.
          Scope <code className="text-foreground">text-primary-hover dark:text-primary</code> to
          that combination. Keep links underlined.
        </p>
      </section>
      <CodeBlock
        language="CSS"
        code={
          '@import "@kipivo/ui/globals.css";\n@source ".";\n\n/* Add .dark to the document element for dark mode. */'
        }
      />
    </div>
  );
}

function Token({ name, value }: { name: string; value: string }) {
  return (
    <div className="relative grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 border-b border-border py-4 pl-12">
      <dt className="min-w-0 break-words font-mono text-xs">
        <span
          className="absolute top-1/2 left-0 size-9 -translate-y-1/2 rounded-lg border border-border"
          style={{ background: `var(--${name})` }}
          aria-hidden="true"
        />
        --{name}
      </dt>
      <dd className="col-start-2 row-span-2 row-start-1">
        <CopyButton key={value} text={`--${name}: ${value};`} label={`Copy --${name}`} />
      </dd>
      <dd className="mt-1 min-w-0 break-words font-mono text-xs leading-relaxed text-muted-foreground">
        {value}
      </dd>
    </div>
  );
}

function ContrastChecker({ colors }: { colors: Record<string, string> }) {
  const id = useId();
  const [foreground, setForeground] = useState("muted-foreground");
  const [background, setBackground] = useState("muted");
  const [target, setTarget] = useState("4.5");
  const ratio = contrast(colors[foreground], colors[background], colors.background);
  const passes = ratio !== null && ratio >= Number(target);

  return (
    <section aria-labelledby="contrast-heading">
      <h2 id="contrast-heading" className="text-lg font-semibold">
        Contrast checker
      </h2>
      <p className="mt-2 mb-5 text-sm leading-relaxed text-muted-foreground">
        Compare shared tokens on the selected surface. Component opacity, hover, and layered
        backgrounds need checking in context.
      </p>
      <div className="rounded-xl border border-border bg-card">
        <form
          aria-label="Contrast checker"
          className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3"
          onSubmit={(event) => event.preventDefault()}
        >
          <div className="grid gap-2">
            <Label htmlFor={`${id}-foreground`}>Foreground</Label>
            <select
              id={`${id}-foreground`}
              className="docs-select w-full"
              value={foreground}
              onChange={(event) => setForeground(event.target.value)}
            >
              {tokens.map((token) => (
                <option key={token}>{token}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${id}-background`}>Background</Label>
            <select
              id={`${id}-background`}
              className="docs-select w-full"
              value={background}
              onChange={(event) => setBackground(event.target.value)}
            >
              {surfaces.map((token) => (
                <option key={token}>{token}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-2 sm:col-span-2 lg:col-span-1">
            <Label htmlFor={`${id}-target`}>Requirement</Label>
            <select
              id={`${id}-target`}
              className="docs-select w-full"
              value={target}
              onChange={(event) => setTarget(event.target.value)}
            >
              <option value="4.5">Small text · 4.5:1</option>
              <option value="3">Control boundary · 3:1</option>
            </select>
          </div>
        </form>
        <div className="px-5 pb-5">
          <div
            aria-label="Color sample"
            className="flex min-h-28 items-center justify-center rounded-lg border border-border p-5"
            style={{ background: `var(--${background})`, color: `var(--${foreground})` }}
          >
            {target === "4.5" ? (
              <p className="text-sm">The quick brown fox jumps over the lazy dog.</p>
            ) : (
              <span
                aria-label="Control boundary sample"
                className="h-10 w-40 rounded-lg border-2"
                style={{ borderColor: `var(--${foreground})` }}
              />
            )}
          </div>
          <p
            className="mt-4 flex flex-wrap items-baseline justify-between gap-2 text-sm"
            role="status"
          >
            <output aria-label="Contrast ratio" className="font-mono font-medium tabular-nums">
              {ratio === null ? "Unavailable" : `${(Math.floor(ratio * 100) / 100).toFixed(2)}:1`}
            </output>
            <span className={passes ? "text-foreground" : "font-medium text-destructive"}>
              {ratio === null
                ? "Canvas color sampling is unavailable."
                : passes
                  ? `Pass · minimum ${target}:1`
                  : `Below ${target}:1`}
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
