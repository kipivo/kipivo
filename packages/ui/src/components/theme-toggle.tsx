import { MoonIcon, SunIcon } from "@kipivo/icons";
import { Button } from "./button";
import { useThemeSelection } from "./theme-provider";

export function ThemeToggle() {
  const { theme, selectTheme } = useThemeSelection();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-muted-foreground"
      data-slot="theme-toggle"
      title="Switch between light and dark themes"
      disabled={theme === undefined}
      onClick={(event) => {
        const dark =
          theme === "system"
            ? document.documentElement.classList.contains("dark")
            : theme === "dark";
        selectTheme(dark ? "light" : "dark", event.currentTarget, event.nativeEvent);
      }}
    >
      <span className="dark:hidden">
        <MoonIcon size={16} aria-hidden="true" />
        <span className="sr-only">Switch to dark theme</span>
      </span>
      <span className="hidden dark:block">
        <SunIcon size={16} aria-hidden="true" />
        <span className="sr-only">Switch to light theme</span>
      </span>
    </Button>
  );
}
