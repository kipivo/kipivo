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
        className="flex min-h-64 items-center justify-center px-6 py-12"
      >
        <Component key={`${variant}-${revision}`} {...args} />
      </section>
      {properties.length > 0 && (
        <details className="border-t border-border" open>
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium outline-ring focus-visible:outline-2">
            Example props
          </summary>
          <p className="px-4 pb-3 text-xs text-muted-foreground">
            Edit the example below. Types come from its TypeScript props.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-y border-border bg-muted text-xs">
                <tr>
                  <th className="px-4 py-2 font-medium">Prop</th>
                  <th className="px-4 py-2 font-medium">Type</th>
                  <th className="px-4 py-2 font-medium">Value</th>
                </tr>
              </thead>
              <tbody>
                {properties.map((property) => (
                  <tr key={property.name} className="border-b border-border last:border-b-0">
                    <th scope="row" className="px-4 py-3 font-mono text-xs font-normal">
                      {property.name}
                    </th>
                    <td className="max-w-52 px-4 py-3 font-mono text-xs text-muted-foreground">
                      {typeLabel(property.type)}
                    </td>
                    <td className="min-w-52 px-4 py-3">
                      <PropControl key={variant} name={property.name} node={property.type} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

function PropControl({ name, node }: { name: string; node: TypeNode }) {
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
      <label className="inline-flex min-h-8 items-center gap-2">
        <input
          className="size-4 accent-primary outline-ring focus-visible:outline-2"
          type="checkbox"
          checked={value === true}
          onChange={(event) => setValue(event.target.checked)}
        />
        <span className="text-xs">{name}</span>
      </label>
    );
  }
  if (
    options.length > 0 &&
    options.length ===
      nodes.reduce((count, item) => count + (item.type === "enum" ? item.members.length : 1), 0)
  ) {
    return (
      <select
        className="docs-select w-full"
        aria-label={name}
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
        aria-label={name}
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
