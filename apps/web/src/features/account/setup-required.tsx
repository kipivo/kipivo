import { renderMarkup } from "@kipivo/i18n";
import { Link } from "@tanstack/react-router";
import { m } from "@kipivo/i18n/messages";

export function SetupRequired() {
  return renderMarkup(m.setupRequired(), {
    link: (chunks) => (
      <Link
        to="/setup"
        className="control-focus rounded-sm font-medium underline underline-offset-4"
      >
        {chunks}
      </Link>
    ),
  });
}
