import type { ApiClient } from "@kipivo/api/contract";
import { Button } from "@kipivo/ui/components/button";
import { Input } from "@kipivo/ui/components/input";
import { Field, FieldLabel, FieldSet } from "@kipivo/ui/components/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@kipivo/ui/components/select";
import { useRef, useEffect, useState, type ReactNode, type SubmitEvent } from "react";
import { accountClient, errorStatus, type CurrentAccount } from "@/features/account/client";
import { useAccountSession } from "@/features/account/session";

function SettingsForm({
  title,
  description,
  save,
  children,
}: {
  title: string;
  description: string;
  save(data: FormData): Promise<void>;
  children: ReactNode | ((markChanged: () => void) => ReactNode);
}) {
  const { refresh } = useAccountSession();
  const [state, setState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setState("saving");
    try {
      await save(data);
      setState("saved");
    } catch (error) {
      setState("failed");
      if ([401, 403].includes(errorStatus(error) ?? 0)) await refresh();
    }
  }
  return (
    <form
      className="grid gap-4 py-6 first:pt-0 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-x-12 sm:py-8"
      onChange={() => setState("idle")}
      onSubmit={(e) => void submit(e)}
    >
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="grid min-w-0 gap-4">
        <FieldSet disabled={state === "saving"}>
          {typeof children === "function" ? children(() => setState("idle")) : children}
        </FieldSet>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={state === "saving"}>
            {state === "saving" ? "Saving…" : "Save changes"}
          </Button>
          {state === "saved" && (
            <span role="status" className="text-sm">
              Changes saved.
            </span>
          )}
          {state === "failed" && (
            <span role="alert" className="text-sm text-destructive">
              Could not save these settings. Reload and try again.
            </span>
          )}
        </div>
      </div>
    </form>
  );
}

export function DirectorySettingsForm() {
  const [size, setSize] = useState<number>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void accountClient()
      .then((api) => api.admin.settings.directory.get(undefined, { signal: controller.signal }))
      .then(
        (result) => {
          if (!controller.signal.aborted) setSize(result.pageSize);
        },
        () => {
          if (!controller.signal.aborted) setFailed(true);
        },
      );
    return () => controller.abort();
  }, []);
  if (size === undefined)
    return (
      <p role="status">
        {failed
          ? "Could not load instance settings. Reload to try again."
          : "Loading instance settings…"}
      </p>
    );
  return (
    <SettingsForm
      title="Account directory"
      description="Applies to all administrators using this instance."
      save={async (data) => {
        const api = await accountClient();
        await api.admin.settings.directory.update({ pageSize: Number(data.get("size")) });
      }}
    >
      <Field className="max-w-fit">
        <FieldLabel htmlFor="directory-size">Accounts per page</FieldLabel>
        <Input
          id="directory-size"
          name="size"
          type="number"
          min={1}
          max={100}
          required
          defaultValue={size}
        />
      </Field>
    </SettingsForm>
  );
}

const menuLabels = [
  { value: "name", label: "Name" },
  { value: "email", label: "Email address" },
];

export function PersonalSettingsForm({ account }: { account: CurrentAccount }) {
  const { refresh } = useAccountSession();
  return (
    <SettingsForm
      title="Personal settings"
      description="These preferences follow your account across devices."
      save={async (data) => {
        const api = await accountClient();
        await api.accounts.me.settings.update({
          menuLabel: data.get("label") === "email" ? "email" : "name",
        });
        await refresh();
      }}
    >
      {(markChanged) => (
        <Field className="max-w-fit">
          <FieldLabel htmlFor="menu-label">Show in account menu</FieldLabel>
          <Select
            name="label"
            items={menuLabels}
            defaultValue={account.settings.menuLabel}
            onValueChange={markChanged}
          >
            <SelectTrigger id="menu-label" className="min-w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start" alignItemWithTrigger={false}>
              <SelectGroup>
                {menuLabels.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      )}
    </SettingsForm>
  );
}

export function EmailSettingsForm() {
  const [settings, setSettings] =
    useState<Awaited<ReturnType<ApiClient["admin"]["settings"]["email"]["get"]>>>();
  const [failed, setFailed] = useState(false);
  const keyField = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const abort = new AbortController();
    void accountClient()
      .then((api) => api.admin.settings.email.get(undefined, { signal: abort.signal }))
      .then((result) => {
        if (!abort.signal.aborted) setSettings(result);
      })
      .catch(() => {
        if (!abort.signal.aborted) setFailed(true);
      });
    return () => abort.abort();
  }, []);
  if (!settings)
    return (
      <p role="status">
        {failed ? "Could not load email settings. Reload to try again." : "Loading email settings…"}
      </p>
    );
  return (
    <SettingsForm
      title="Email delivery"
      description="Instance-wide delivery for sign-in links, email codes, and password resets."
      save={async (data) => {
        const from = String(data.get("from") ?? "").trim() || null;
        const replacement = String(data.get("apiKey") ?? "").trim();
        const remove = data.get("removeKey") === "on";
        const result = await (
          await accountClient()
        ).admin.settings.email.update({
          enabled: data.get("enabled") === "on",
          from,
          ...(remove ? { apiKey: null } : replacement ? { apiKey: replacement } : {}),
        });
        setSettings(result);
        if (keyField.current) keyField.current.value = "";
      }}
    >
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="enabled" defaultChecked={settings.enabled} />
        Enable email delivery
      </label>
      <Field>
        <FieldLabel htmlFor="sender-address">Sender email</FieldLabel>
        <Input type="email" id="sender-address" name="from" defaultValue={settings.from ?? ""} />
        <p className="text-xs text-muted-foreground">
          Use a sender on your verified Resend domain.
        </p>
      </Field>
      <Field>
        <FieldLabel htmlFor="sender-key">Resend API key</FieldLabel>
        <Input
          type="password"
          autoComplete="new-password"
          ref={keyField}
          id="sender-key"
          name="apiKey"
          maxLength={2048}
        />
        <p className="text-xs text-muted-foreground">
          {settings.hasApiKey
            ? "A key is saved. Leave blank to keep it, or enter a replacement."
            : "No key saved. Add a sending key before enabling delivery."}
        </p>
      </Field>
      {settings.hasApiKey && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="removeKey" />
          Remove saved key (disable delivery first)
        </label>
      )}
    </SettingsForm>
  );
}
