import { Button } from "@kipivo/ui/components/button";
import { useEffect, useState } from "react";
import {
  accountClient,
  errorStatus,
  type AccountPage,
  type CurrentAccount,
  type ListedAccount,
} from "@/features/account/client";
import { AccountDirectoryRow } from "./row";

import { DirectorySearch } from "./search";

type DirectoryState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; page: AccountPage };

type DirectoryProps = {
  viewer: CurrentAccount;
  onAccessError(status: number | undefined): void;
};

export function AccountDirectory(props: DirectoryProps) {
  const [query, setQuery] = useState("");
  return (
    <section aria-label="Account directory">
      <DirectorySearch onSearch={setQuery} />
      <DirectoryResults key={query} query={query} {...props} />
    </section>
  );
}

function DirectoryResults({ viewer, onAccessError, query }: DirectoryProps & { query: string }) {
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const [reload, setReload] = useState(0);
  const [directory, setDirectory] = useState<DirectoryState>({ status: "loading" });
  const [notice, setNotice] = useState("");
  const cursor = cursors.at(-1);

  useEffect(() => {
    const controller = new AbortController();
    void accountClient()
      .then((api) =>
        api.admin.accounts.list(
          { cursor, query: query || undefined },
          { signal: controller.signal },
        ),
      )
      .then(
        (page) => {
          if (!controller.signal.aborted) setDirectory({ status: "ready", page });
        },
        (cause: unknown) => {
          if (controller.signal.aborted) return;
          const status = errorStatus(cause);
          onAccessError(status);
          setDirectory({
            status: "error",
            message:
              status === 403
                ? "You no longer have permission to view accounts."
                : "Unable to load accounts.",
          });
        },
      );
    return () => controller.abort();
  }, [cursor, onAccessError, query, reload]);

  function goToPage(next: (string | undefined)[]) {
    setNotice("");
    setDirectory({ status: "loading" });
    setCursors(next);
  }

  function applyRoleChange(account: ListedAccount) {
    setDirectory((current) =>
      current.status === "ready"
        ? {
            status: "ready",
            page: {
              ...current.page,
              items: current.page.items.map((item) => (item.id === account.id ? account : item)),
            },
          }
        : current,
    );
    setNotice(
      `${account.name} is now ${account.role === "admin" ? "an administrator" : "a member"}.`,
    );
  }

  const columns =
    "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-3 sm:grid-cols-[minmax(0,1fr)_8rem_7rem] sm:px-5";
  const page = directory.status === "ready" ? directory.page : undefined;
  return (
    <>
      <p role="status" className={notice ? "mb-3 text-sm text-foreground" : "sr-only"}>
        {notice}
      </p>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div
          aria-hidden="true"
          className={`${columns} border-b border-border bg-muted/40 py-2.5 text-xs font-medium text-muted-foreground`}
        >
          <span>Account</span>
          <span className="hidden sm:inline">Role</span>
        </div>
        {directory.status === "loading" && (
          <p role="status" className="p-5 text-sm text-muted-foreground">
            Loading accounts…
          </p>
        )}
        {directory.status === "error" && (
          <div className="p-5">
            <p role="alert" className="text-sm text-destructive">
              {directory.message}
            </p>
            <Button
              variant="outline"
              className="mt-3"
              onClick={() => {
                setDirectory({ status: "loading" });
                setReload((attempt) => attempt + 1);
              }}
            >
              Try again
            </Button>
          </div>
        )}
        {page &&
          (page.items.length === 0 ? (
            <p role="status" className="p-5 text-sm text-muted-foreground">
              {query ? "No accounts match your search." : "No accounts on this page."}
            </p>
          ) : (
            <ul aria-label="Accounts" className="divide-y divide-border">
              {page.items.map((account) => (
                <AccountDirectoryRow
                  key={account.id}
                  account={account}
                  viewer={viewer}
                  className={columns}
                  onRoleChange={applyRoleChange}
                  onAccessError={onAccessError}
                />
              ))}
            </ul>
          ))}
      </div>
      {page && (page.nextCursor || cursors.length > 1) && (
        <nav
          aria-label="Account pages"
          className="mt-4 flex flex-wrap items-center justify-between gap-3"
        >
          <span className="text-sm text-muted-foreground">Page {cursors.length}</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={cursors.length === 1}
              onClick={() => goToPage(cursors.slice(0, -1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={!page.nextCursor}
              onClick={() => {
                if (page.nextCursor) goToPage([...cursors, page.nextCursor]);
              }}
            >
              Next
            </Button>
          </div>
        </nav>
      )}
    </>
  );
}
