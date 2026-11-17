import { StoryProvider, useStory, useStoryArgs, type WithControlProps } from "@fumadocs/story";
import type { TypeNode } from "@fumadocs/story/type-tree";
import { useFieldValue } from "@fumari/stf";
import { Button } from "@kipivo/ui/components/button";
import { Input } from "@kipivo/ui/components/input";
import { Label } from "@kipivo/ui/components/label";
import { useId, useState } from "react";

export function StoryPanel(props: WithControlProps) {
  return (
    <StoryProvider {...props}>
      <Content />
    </StoryProvider>
  );
}

function Content() {
  const { Component, presets, preset, variant, setVariant } = useStory();
  const args = useStoryArgs();
  const [revision, setRevision] = useState(0);
  const variantId = useId();
  const node = preset?.controls;
  const properties = node?.type === "object" ? node.properties : [];

  return (
    <div className="min-w-0 rounded-xl border border-border">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-xl border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <Label htmlFor={variantId}>Preset</Label>
          <select
            id={variantId}
            className="docs-select"
            value={variant}
            onChange={(event) => setVariant(event.target.value)}
          >
            {presets.map((item) => (
              <option key={item.variant} value={item.variant}>
                {item.variant === "default" ? "Default" : item.variant}
              </option>
            ))}
          </select>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setVariant(variant);
            setRevision((value) => value + 1);
          }}
        >
          Reset example
        </Button>
      </div>
      <section
        aria-label="Component preview"
        className="flex min-h-48 min-w-0 items-center justify-center px-5 py-10 sm:min-h-56 sm:px-6"
      >
        <Component key={`${variant}-${revision}`} {...args} />
      </section>
      {properties.length > 0 && (
        <details className="border-t border-border" open>
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium outline-ring focus-visible:outline-2">
            Example props
          </summary>
          <p className="px-4 pb-3 text-xs text-muted-foreground">
            Changes appear in the preview above. Reset restores the selected preset.
          </p>
          <form
            aria-label="Example props"
            className="border-t border-border"
            onSubmit={(event) => event.preventDefault()}
          >
            {properties.map((property) => (
              <PropField
                key={`${variant}-${property.name}`}
                name={property.name}
                node={property.type}
              />
            ))}
          </form>
        </details>
      )}
    </div>
  );
}

function types(node: TypeNode): TypeNode[] {
  if (node.type === "union")
    return node.types
      .flatMap(types)
      .filter((item) => item.type !== "undefined" && item.type !== "null");
  if (node.type === "intersection") return types(node.intersection);
  return [node];
}

function typeLabel(node: TypeNode): string {
  return types(node)
    .map((item) => {
      if (item.type === "literal") return JSON.stringify(item.value) ?? String(item.value);
      if (item.type === "enum") return item.members.map((member) => member.label).join(" | ");
      return item.type;
    })
    .join(" | ");
}

function PropField({ name, node }: { name: string; node: TypeNode }) {
  const id = useId();
  const nodes = types(node);
  const optionCount = nodes.reduce(
    (count, item) => count + (item.type === "enum" ? item.members.length : 1),
    0,
  );
  const summary =
    optionCount > 1 && nodes.every((item) => item.type === "literal" || item.type === "enum")
      ? `${optionCount} options`
      : typeLabel(node);

  return (
    <div className="grid min-w-0 items-center gap-3 border-b border-border px-4 py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <div className="flex min-w-0 items-baseline justify-between gap-3 sm:grid sm:justify-start sm:gap-1">
        <Label htmlFor={id} className="font-mono text-xs">
          {name}
        </Label>
        <p id={`${id}-type`} title={typeLabel(node)} className="text-xs text-muted-foreground">
          {summary}
        </p>
      </div>
      <PropControl id={id} name={name} node={node} />
    </div>
  );
}

function PropControl({ id, name, node }: { id: string; name: string; node: TypeNode }) {
  const [value, setValue] = useFieldValue([name]);
  const nodes = types(node);
  const scalar = nodes[0];
  const options = nodes.flatMap((item) =>
    item.type === "enum"
      ? item.members
      : item.type === "literal"
        ? [{ label: String(item.value), value: item.value }]
        : [],
  );

  if (
    scalar?.type === "boolean" ||
    (options.length === 2 && options.every((option) => typeof option.value === "boolean"))
  ) {
    return (
      <div className="inline-flex min-h-9 items-center gap-2">
        <input
          id={id}
          aria-describedby={`${id}-type`}
          className="size-4 accent-primary outline-ring focus-visible:outline-2"
          type="checkbox"
          checked={value === true}
          onChange={(event) => setValue(event.target.checked)}
        />
        <span aria-hidden="true" className="font-mono text-xs text-muted-foreground">
          {value === true ? "true" : "false"}
        </span>
      </div>
    );
  }
  if (
    options.length > 0 &&
    options.length ===
      nodes.reduce((count, item) => count + (item.type === "enum" ? item.members.length : 1), 0)
  ) {
    return (
      <select
        id={id}
        className="docs-select w-full"
        aria-describedby={`${id}-type`}
        value={value === undefined ? "" : String(value)}
        onChange={(event) =>
          setValue(options.find((option) => String(option.value) === event.target.value)?.value)
        }
      >
        <option value="">Use default</option>
        {options.map((option) => (
          <option key={String(option.value)} value={String(option.value)}>
            {typeof option.value === "string" ? option.value : option.label}
          </option>
        ))}
      </select>
    );
  }
  if (scalar?.type === "string" || scalar?.type === "number") {
    return (
      <Input
        id={id}
        aria-describedby={`${id}-type`}
        type={scalar.type === "number" ? "number" : "text"}
        value={value === undefined ? "" : String(value)}
        onChange={(event) =>
          setValue(
            scalar.type === "number"
              ? event.target.value === ""
                ? undefined
                : event.target.valueAsNumber
              : event.target.value,
          )
        }
      />
    );
  }
  return (
    <span className="text-xs text-muted-foreground">Configure this prop in the story source.</span>
  );
}
