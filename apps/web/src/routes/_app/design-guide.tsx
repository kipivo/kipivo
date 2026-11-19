import { createFileRoute, Link } from "@tanstack/react-router";
import { guideLink, sectionHeader, workspacePanel } from "@/layout/workspace-styles";
import { Assembly } from "@/features/brand/assembly";

export const Route = createFileRoute("/_app/design-guide")({
  head: () => ({ meta: [{ title: "Design guide | Kipivo" }] }),
  component: DesignGuide,
});

const swatches = [
  { label: "Coral", color: "var(--color-brand-coral)", token: "#FF6B4A", use: "K 标与品牌配图" },
  {
    label: "Amber",
    color: "var(--color-brand-amber)",
    token: "#FFB02E",
    use: "品牌圆点与焦点标记",
  },
  { label: "Action", color: "var(--primary)", token: "--primary", use: "新建、保存等主按钮" },
  { label: "Canvas", color: "var(--background)", token: "--background", use: "页面底色" },
  { label: "Surface", color: "var(--card)", token: "--card", use: "浮在底色上的内容" },
  { label: "Ink", color: "var(--foreground)", token: "--foreground", use: "标题与关键结果" },
];

const guideColumns = "grid grid-cols-2 gap-4 [@container_workspace_(max-width:36rem)]:grid-cols-1";
const note = "mt-3 text-sm/[1.6] text-muted-foreground";
const dimensionLabel = "text-xs/normal text-muted-foreground";
const dimensionSample = "grid justify-items-start gap-2";
const typeLabel = "mb-1 block text-xs/normal text-muted-foreground";
const swatchCaption = "mt-0.5 block text-xs/normal wrap-anywhere text-muted-foreground";

function DesignGuide() {
  return (
    <main className="grid gap-4 md:gap-6" lang="zh-CN">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 lang="en" className="text-workspace-title">
            Design guide
          </h1>
          <p className="mt-2 text-sm/normal text-muted-foreground">
            从工作台到运行日志，统一 Kipivo 的视觉层级与操作反馈。
          </p>
        </div>
      </header>
      <section className={`${workspacePanel} @container/palette`} aria-labelledby="colors-heading">
        <div className={sectionHeader}>
          <h2 className="text-section-title tracking-normal" id="colors-heading">
            品牌与色彩
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
              <strong lang="en" className="mt-2 block text-sm/normal">
                {swatch.label}
              </strong>
              <code className={swatchCaption}>{swatch.token}</code>
              <p className={swatchCaption}>{swatch.use}</p>
            </div>
          ))}
        </div>
        <p className={note}>
          主按钮随主题在墨灰和暖白之间切换。珊瑚色用于 K 标与配图，琥珀色标记焦点与运行路径。
        </p>
      </section>
      <section
        className={`${workspacePanel} ${guideColumns} items-center [&>figure]:rounded-lg`}
        aria-labelledby="motion-heading"
      >
        <div>
          <div className={sectionHeader}>
            <h2 className="text-section-title tracking-normal" id="motion-heading">
              品牌动效
            </h2>
          </div>
          <p className={note}>
            盖板和中层电路依次叠在底座上方。运行记录沿用这套图形，用琥珀色光点标出检查请求的去向。
          </p>
          {import.meta.env.DEV && (
            <Link to="/runs" className={guideLink}>
              查看本地运行记录
            </Link>
          )}
        </div>
        <Assembly />
      </section>
      <div className={guideColumns}>
        <section className={workspacePanel} aria-labelledby="type-heading">
          <div className={sectionHeader}>
            <h2 className="text-section-title tracking-normal" id="type-heading">
              字阶与字重
            </h2>
          </div>
          <div>
            <span className={typeLabel}>页面标题 · 28–36 px · Geist 650</span>
            <b className="text-workspace-title">Workbench</b>
          </div>
          <div className="mt-3.5">
            <span className={typeLabel}>区块标题 · 20 / 26</span>
            <strong className="text-section-title">Task board</strong>
          </div>
          <div className="mt-3.5">
            <span className={typeLabel}>正文 · 14 / 21</span>
            <p className="text-sm/[21px]">选择一次运行，查看退出码和日志。</p>
          </div>
          <div className="mt-3.5">
            <span className={typeLabel}>日志 · 等宽 13 / 21</span>
            <code className="font-mono text-[13px]/[21px]">$ bun run check</code>
          </div>
        </section>
        <section className={workspacePanel} aria-labelledby="geometry-heading">
          <div className={sectionHeader}>
            <h2 className="text-section-title tracking-normal" id="geometry-heading">
              间距与形状
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
            控件内留 4–8 px，卡片之间留 16 px。面板内边距在手机上为 16 px，桌面逐步增至 24 px。
          </p>
          <div className="mt-[22px] grid grid-cols-3 gap-2">
            {[8, 10, 16].map((n, i) => (
              <div key={n} className={dimensionSample}>
                <i
                  className="block aspect-5/4 w-[min(80%,4rem)] border border-input bg-muted"
                  style={{ borderRadius: n }}
                />
                <code className={dimensionLabel}>{n} px</code>
                <span className={dimensionLabel}>{["导航项", "任务卡", "焦点面板"][i]}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className={workspacePanel} aria-labelledby="patterns-heading">
        <div className={sectionHeader}>
          <h2 className="text-section-title tracking-normal" id="patterns-heading">
            页面与交互
          </h2>
        </div>
        <dl
          className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4.5 gap-y-2.5 text-sm/[1.6] workspace-compact:grid-cols-1
          workspace-compact:gap-[3px] [&>dt]:font-semibold [&>dd]:text-muted-foreground
          workspace-compact:[&>dd+dt]:mt-2.5"
        >
          <dt>工作台</dt>
          <dd>当前任务和列表里的任务名最多显示两行。点 Edit task 或任务卡可查看、编辑完整标题。</dd>
          <dt>运行记录</dt>
          <dd>状态同时提供文字和图形。退出码与日志放在同一面板，日志换行并保留原始内容。</dd>
          <dt>表单与弹层</dt>
          <dd>
            标签持续可见，错误放在字段附近。桌面从右侧打开编辑器，窄屏用居中弹窗，关闭后焦点回到操作入口。
          </dd>
          <dt>窄屏布局</dt>
          <dd>标题和 New task 同排。手机用一行展示完成数量和进度条，触屏操作区至少 44 × 44 px。</dd>
          <dt>键盘与动效</dt>
          <dd>交互元素使用清晰的 2 px 焦点环。减少动态效果时保留即时的状态反馈。</dd>
        </dl>
      </section>
    </main>
  );
}
