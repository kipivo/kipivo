import { createFileRoute } from "@tanstack/react-router";
import { useAccountSession } from "@/features/account/session";
import { pageHeader } from "@/layout/workspace-styles";
import { Board } from "@/features/workbench/board";

export const Route = createFileRoute("/_app/workbench")({
  head: () => ({ meta: [{ title: "Workbench | Kipivo" }] }),
  component: Workbench,
});
function Workbench() {
  const { session } = useAccountSession();
  const scope = session.status === "signed-in" ? `account:${session.account.id}` : "guest";
  return (
    <main>
      {session.status === "loading" ? (
        <>
          <header className={pageHeader}>
            <h1 className="text-workspace-title">Workbench</h1>
          </header>
          <p role="status" className="text-sm text-muted-foreground">
            Opening your board…
          </p>
        </>
      ) : (
        <Board
          key={scope}
          scope={scope}
          description={
            session.status === "signed-in"
              ? "Your account’s tasks are saved in this browser."
              : "Guest board · Tasks are saved in this browser."
          }
        />
      )}
    </main>
  );
}
