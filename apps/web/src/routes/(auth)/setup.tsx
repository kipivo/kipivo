import { PageTitle } from "@kipivo/ui/blocks/page";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState, type SubmitEvent } from "react";
import { Button } from "@kipivo/ui/components/button";
import { accountClient } from "@/features/account/client";
import { CredentialFields } from "@/features/account/credentials-form";
import { readInstallStatus } from "@/features/account/install-status";
import { m } from "@kipivo/i18n/messages";

export const Route = createFileRoute("/(auth)/setup")({
  head: () => ({ meta: [{ title: m.setupDocumentTitle() }] }),
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
  const [failed, setFailed] = useState(false);
  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setFailed(false);
    try {
      await (
        await accountClient()
      ).setup.create({
        name: String(data.get("name")).trim(),
        email: String(data.get("email")).trim(),
        password: String(data.get("password")),
      });
    } catch {
      // A lost response can follow a committed installation. Never replay the write.
      if ((await readInstallStatus().catch(() => null)) !== false) {
        setFailed(true);
        setBusy(false);
        return;
      }
    }
    await router.navigate({ to: "/sign-in", search: { next: "/admin" }, replace: true });
  }
  return (
    <>
      <PageTitle>{m.setupHeading()}</PageTitle>
      {open ? (
        <>
          <p className="mt-2 text-sm text-muted-foreground">{m.setupIntro()}</p>
          <form method="post" onSubmit={(event) => void submit(event)} className="mt-7 grid gap-4">
            <CredentialFields creating />
            {failed && (
              <p role="alert" className="text-sm text-destructive">
                {m.setupFailed()}
              </p>
            )}
            <Button type="submit" disabled={busy}>
              {busy ? m.setupBusy() : m.setupSubmit()}
            </Button>
          </form>
        </>
      ) : (
        <>
          <p role="status">{m.setupUnavailable()}</p>
          <Button onClick={() => void router.invalidate()}>{m.setupCheckAgain()}</Button>
        </>
      )}
    </>
  );
}
