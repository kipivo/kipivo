import { Wordmark } from "@kipivo/ui";
import { Link } from "@tanstack/react-router";
import logo from "@assets/logo.svg?no-inline";

export function HomeLink() {
  return (
    <Link to="/" className="control-focus w-fit rounded-lg">
      <Wordmark logo={logo} name="Kipivo" variant="framed" />
    </Link>
  );
}
