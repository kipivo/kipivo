import { createFileRoute, Link } from "@tanstack/react-router";
import { guideLink, sectionHeader, workspacePanel } from "@/layout/workspace-styles";
import { Assembly } from "@/features/brand/assembly";

export const Route = createFileRoute("/_app/design-guide")({
  head: () => ({ meta: [{ title: "Design guide | Kipivo" }] }),
  component: DesignGuide,
});

const swatches = [
  {
    label: "Coral",
    color: "var(--color-brand-coral)",
    token: "#FF6B4A",
    use: "K mark and brand artwork",
  },
  {
    label: "Amber",
    color: "var(--color-brand-amber)",
    token: "#FFB02E",
    use: "Brand dot and focus markers",
  },
  {
    label: "Action",
    color: "var(--primary)",
    token: "--primary",
    use: "Primary actions such as New task and Save",
  },
  { label: "Canvas", color: "var(--background)", token: "--background", use: "Page background" },
  {
    label: "Surface",
    color: "var(--card)",
    token: "--card",
    use: "Cards and other raised surfaces",
  },
  {
    label: "Ink",
    color: "var(--foreground)",
    token: "--foreground",
    use: "Headings and key results",
  },
];

const guideColumns = "grid grid-cols-2 gap-4 [@container_workspace_(max-width:36rem)]:grid-cols-1";
const note = "mt-3 text-sm/[1.6] text-muted-foreground";
const dimensionLabel = "text-xs/normal text-muted-foreground";
const dimensionSample = "grid justify-items-start gap-2";
const typeLabel = "mb-1 block text-xs/normal text-muted-foreground";
const swatchCaption = "mt-0.5 block text-xs/normal wrap-anywhere text-muted-foreground";

function DesignGuide() {
  return (
    <main className="grid gap-4 md:gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-workspace-title">Design guide</h1>
          <p className="mt-2 text-sm/normal text-muted-foreground">
            Typography, color, and interaction patterns for the workbench and run logs.
          </p>
        </div>
      </header>
      <section className={`${workspacePanel} @container/palette`} aria-labelledby="colors-heading">
        <div className={sectionHeader}>
          <h2 className="text-section-title tracking-normal" id="colors-heading">
            Brand and color
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-4 [@container_palette_(width>19rem)]:grid-cols-3 [@container_palette_(width>40rem)]:grid-cols-6">
          {swatches.map((swatch) => (
            <div key={swatch.label} className="min-w-0">
              <div
                className="h-11 rounded-control border"
                aria-hidden="true"
                style={{ backgroundColor: swatch.color }}
              />
              <strong className="mt-2 block text-sm/normal">{swatch.label}</strong>
              <code className={swatchCaption}>{swatch.token}</code>
              <p className={swatchCaption}>{swatch.use}</p>
            </div>
          ))}
        </div>
        <p className={note}>
          Primary buttons use ink gray in light mode and warm white in dark mode. Coral marks the K
          logo and illustrations. Amber highlights points of focus and traces the path of a run.
        </p>
      </section>
      <section
        className={`${workspacePanel} ${guideColumns} items-center [&>figure]:rounded-lg`}
        aria-labelledby="motion-heading"
      >
        <div>
          <div className={sectionHeader}>
            <h2 className="text-section-title tracking-normal" id="motion-heading">
              Brand motion
            </h2>
          </div>
          <p className={note}>
            The cover and circuit board sit in layers above the base. The run diagram uses the same
            shapes and an amber dot to show where a check request goes.
          </p>
          {import.meta.env.DEV && (
            <Link to="/runs" className={guideLink}>
              View local runs
            </Link>
          )}
        </div>
        <Assembly />
      </section>
      <div className={guideColumns}>
        <section className={workspacePanel} aria-labelledby="type-heading">
          <div className={sectionHeader}>
            <h2 className="text-section-title tracking-normal" id="type-heading">
              Type scale and weight
            </h2>
          </div>
          <div>
            <span className={typeLabel}>Page title · 28–36 px · Geist 650</span>
            <b className="text-workspace-title">Workbench</b>
          </div>
          <div className="mt-3.5">
            <span className={typeLabel}>Section heading · 20 / 26</span>
            <strong className="text-section-title">Task board</strong>
          </div>
          <div className="mt-3.5">
            <span className={typeLabel}>Body text · 14 / 21</span>
            <p className="text-sm/[21px]">Select a run to see its exit code and logs.</p>
          </div>
          <div className="mt-3.5">
            <span className={typeLabel}>Logs · monospace 13 / 21</span>
            <code className="font-mono text-[13px]/[21px]">$ bun run check</code>
          </div>
        </section>
        <section className={workspacePanel} aria-labelledby="geometry-heading">
          <div className={sectionHeader}>
            <h2 className="text-section-title tracking-normal" id="geometry-heading">
              Spacing and shape
            </h2>
          </div>
          <div className="mt-7 mb-3.5 grid grid-cols-6 items-end gap-2">
            {[4, 8, 12, 16, 24, 32].map((n) => (
              <div key={n} className={dimensionSample}>
                <i className="block w-[min(65%,2rem)] bg-primary" style={{ height: n }} />
                <code className={dimensionLabel}>{n}</code>
              </div>
            ))}
          </div>
          <p className="text-sm/[1.6]">
            Allow 4–8 px inside controls and 16 px between cards. Panel padding scales from 16 px on
            mobile to 24 px on desktop.
          </p>
          <div className="mt-[22px] grid grid-cols-3 gap-2">
            {[8, 10, 16].map((n, i) => (
              <div key={n} className={dimensionSample}>
                <i
                  className="block aspect-5/4 w-[min(80%,4rem)] border border-input bg-muted"
                  style={{ borderRadius: n }}
                />
                <code className={dimensionLabel}>{n} px</code>
                <span className={dimensionLabel}>
                  {["Nav item", "Task card", "Focus panel"][i]}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className={workspacePanel} aria-labelledby="patterns-heading">
        <div className={sectionHeader}>
          <h2 className="text-section-title tracking-normal" id="patterns-heading">
            Pages and interactions
          </h2>
        </div>
        <dl
          className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4.5 gap-y-2.5 text-sm/[1.6] workspace-compact:grid-cols-1
          workspace-compact:gap-[3px] [&>dt]:font-semibold [&>dd]:text-muted-foreground
          workspace-compact:[&>dd+dt]:mt-2.5"
        >
          <dt>Workbench</dt>
          <dd>
            Task titles take up to two lines in the focus card and on the board. Select Edit task or
            a task card to read and edit the full title.
          </dd>
          <dt>Run history</dt>
          <dd>
            Each status has a label and a symbol. The exit code and logs share a panel. Long lines
            wrap and preserve the original output.
          </dd>
          <dt>Forms and dialogs</dt>
          <dd>
            Keep labels visible and show errors beside their fields. The editor opens on the right
            on desktop and in a centered dialog on narrow screens. Closing it returns focus to the
            control that opened it.
          </dd>
          <dt>Narrow screens</dt>
          <dd>
            Keep the title and New task on one line. On mobile, the completed count and progress bar
            share a row. Touch targets are at least 44 × 44 px.
          </dd>
          <dt>Keyboard and motion</dt>
          <dd>
            Use a visible 2 px focus ring on interactive controls. When reduced motion is enabled,
            show state changes immediately.
          </dd>
        </dl>
      </section>
    </main>
  );
}
