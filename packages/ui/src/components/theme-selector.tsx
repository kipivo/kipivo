import { MonitorIcon, MoonIcon, SunIcon } from "@kipivo/icons";
import { useId, type ChangeEvent, type CSSProperties } from "react";

export const themeOptions = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
  { value: "system", label: "System", icon: MonitorIcon },
] as const;

export type ThemePreference = (typeof themeOptions)[number]["value"];

interface ThemeSelectorProps {
  theme: ThemePreference | undefined;
  onThemeChange: (theme: ThemePreference, event: ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  labels?: Record<ThemePreference | "label", string>;
}

export function ThemeSelector({ theme, onThemeChange, disabled, labels }: ThemeSelectorProps) {
  const name = useId();
  const selectedIndex = themeOptions.findIndex(({ value }) => value === theme);

  return (
    <fieldset
      data-slot="theme-selector"
      className="inline-flex items-center rounded-full border border-border bg-muted/60 p-0.5 disabled:pointer-events-none disabled:opacity-50"
      disabled={disabled}
    >
      <legend className="sr-only">{labels?.label ?? "Theme"}</legend>
      <div className="relative flex">
        {selectedIndex >= 0 && (
          <span
            aria-hidden="true"
            data-slot="theme-indicator"
            className="pointer-events-none absolute inset-y-0 start-0 w-1/3 translate-x-(--theme-offset) rounded-full bg-background shadow-xs inset-ring-1 inset-ring-input motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out rtl:-translate-x-(--theme-offset)"
            style={{ "--theme-offset": `${selectedIndex * 100}%` } as CSSProperties}
          />
        )}
        {themeOptions.map(({ value, label, icon: Icon }) => (
          <label key={value} title={labels?.[value] ?? label} className="group relative">
            <span className="sr-only">{labels?.[value] ?? label}</span>
            <input
              type="radio"
              name={name}
              value={value}
              checked={theme === value}
              onChange={(event) => onThemeChange(value, event)}
              className="peer absolute inset-0 size-full cursor-pointer opacity-0"
            />
            <span className="pointer-events-none grid size-8 place-items-center rounded-full text-muted-foreground motion-safe:transition-colors group-hover:text-foreground peer-checked:text-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-ring pointer-coarse:size-11">
              <Icon
                data-theme-icon={value}
                size={16}
                strokeWidth={2}
                aria-hidden="true"
                className="motion-safe:transition-transform motion-safe:duration-150 motion-safe:group-active:scale-90"
              />
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
