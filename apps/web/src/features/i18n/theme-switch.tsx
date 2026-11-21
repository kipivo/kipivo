import { ThemeSwitch as SharedThemeSwitch } from "@kipivo/ui/components/theme-provider";
import { useLocale } from "./locale";

export function ThemeSwitch() {
  const locale = useLocale();
  return <SharedThemeSwitch locale={locale} />;
}
