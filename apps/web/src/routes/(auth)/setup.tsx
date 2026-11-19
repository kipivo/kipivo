import { PageTitle } from "@kipivo/ui/blocks/page";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState, type SubmitEvent } from "react";
import { Button } from "@kipivo/ui/components/button";
import { accountClient } from "@/features/account/client";
import { CredentialFields } from "@/features/account/credentials-form";
import { readInstallStatus } from "@/features/account/install-status";

export const Route = createFileRoute("/(auth)/setup")({
  head: () => ({ meta: [{ title: "Administrator setup | Kipivo" }] }),
  beforeLoad: async () => {
    const open = await readInstallStatus();
    if (open === false) throw redirect({ to: "/", replace: true });
    return { open };
  },
  component: SetupRoute,
});

function SetupRoute() {
  const { open } = Route.useRouteContext();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    try {
      await (
        await accountClient()
      ).setup.install({
        name: String(data.get("name")).trim(),
        email: String(data.get("email")).trim(),
        password: String(data.get("password")),
      });
    } catch {
      // A lost response can follow a committed installation. Never replay the write.
      if ((await readInstallStatus().catch(() => null)) !== false) {
        setMessage("Could not confirm installation. Check your details and try again.");
        setBusy(false);
        return;
      }
    }
    await router.navigate({ to: "/sign-in", search: { next: "/admin" }, replace: true });
  }
  return (
    <>
      <PageTitle>Administrator setup</PageTitle>
      {open ? (
        <>
          <p className="mt-2 text-sm text-muted-foreground">
            Create the first administrator account. This page closes after installation.
          </p>
          <form method="post" onSubmit={(event) => void submit(event)} className="mt-7 grid gap-4">
            <CredentialFields creating />
            {message && (
              <p role="alert" className="text-sm text-destructive">
                {message}
              </p>
            )}
            <Button type="submit" disabled={busy}>
              {busy ? "Installing…" : "Create administrator"}
            </Button>
          </form>
        </>
      ) : (
        <>
          <p role="status">Installation status is unavailable.</p>
          <Button onClick={() => void router.invalidate()}>Check again</Button>
        </>
      )}
    </>
  );
}
