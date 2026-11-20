import { Link } from "@tanstack/react-router";

export function SetupRequired() {
  return (
    <>
      Complete administrator setup to continue.{" "}
      <Link
        to="/setup"
        className="control-focus rounded-sm font-medium underline underline-offset-4"
      >
        Open setup
      </Link>
    </>
  );
}
