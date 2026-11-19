import { directoryQueryMaxLength } from "@kipivo/admin/directory";
import { Button } from "@kipivo/ui/components/button";
import { Input } from "@kipivo/ui/components/input";
import { Label } from "@kipivo/ui/components/label";
import { useState } from "react";

export function DirectorySearch({ onSearch }: { onSearch(query: string): void }) {
  const [draft, setDraft] = useState("");
  return (
    <form
      role="search"
      aria-label="Account directory"
      className="mb-4 grid gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(draft.trim());
      }}
    >
      <Label htmlFor="account-search">Search by name or email</Label>
      <div className="flex flex-wrap gap-2">
        <Input
          id="account-search"
          type="search"
          className="min-w-40 flex-1"
          value={draft}
          maxLength={directoryQueryMaxLength}
          onChange={(event) => setDraft(event.target.value)}
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setDraft("");
            onSearch("");
          }}
        >
          Clear
        </Button>
      </div>
    </form>
  );
}
