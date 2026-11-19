import { Button } from "@kipivo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@kipivo/ui/components/card";
import { Input } from "@kipivo/ui/components/input";
import { Label } from "@kipivo/ui/components/label";
import { Textarea } from "@kipivo/ui/components/textarea";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type SubmitEvent, useId, useRef, useState } from "react";
import { expect } from "storybook/test";

function RunConfiguration({ readOnly }: { readOnly: boolean }) {
  const id = useId();
  const nameInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(readOnly ? "Workspace checks" : "");
  const [notes, setNotes] = useState(readOnly ? "Verify the workspace before opening a PR." : "");
  const [nameError, setNameError] = useState(false);
  const [confirmation, setConfirmation] = useState("");

  function save(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readOnly) return;

    const runName = name.trim();
    if (!runName) {
      setNameError(true);
      nameInput.current?.focus();
      return;
    }

    setName(runName);
    setNameError(false);
    setConfirmation(`Saved configuration for “${runName}”.`);
  }

  const nameId = `${id}-name`;
  const notesId = `${id}-notes`;
  const errorId = `${id}-name-error`;

  return (
    <form noValidate onSubmit={save} aria-labelledby={`${id}-title`}>
      <Card className="mx-auto w-full max-w-lg [--card-spacing:--spacing(5)] sm:[--card-spacing:--spacing(6)]">
        <CardHeader>
          <h1 id={`${id}-title`} className="text-xl font-semibold tracking-tight">
            Run configuration
          </h1>
          <CardDescription>
            {readOnly
              ? "Saved settings for this check run."
              : "Name this check run and add any context you want to keep with it."}
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-5">
          <div className="grid gap-2">
            <Label htmlFor={nameId}>Run name</Label>
            <Input
              id={nameId}
              ref={nameInput}
              value={name}
              required={!readOnly}
              readOnly={readOnly}
              aria-invalid={nameError || undefined}
              aria-describedby={nameError ? errorId : undefined}
              placeholder="Workspace checks"
              onChange={(event) => {
                setName(event.currentTarget.value);
                setNameError(false);
                setConfirmation("");
              }}
            />
            {nameError && (
              <p id={errorId} role="alert" className="text-sm text-destructive">
                Enter a run name.
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor={notesId}>
              Notes <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id={notesId}
              className="min-h-24"
              value={notes}
              readOnly={readOnly}
              placeholder="What should someone know about this run?"
              onChange={(event) => {
                setNotes(event.currentTarget.value);
                setConfirmation("");
              }}
            />
          </div>
        </CardContent>

        {!readOnly && (
          <CardFooter className="flex-wrap gap-x-4 gap-y-2">
            <Button type="submit">Save configuration</Button>
            <p role="status" className="min-w-0 wrap-anywhere text-sm text-muted-foreground">
              {confirmation}
            </p>
          </CardFooter>
        )}
      </Card>
    </form>
  );
}

const meta = {
  title: "Patterns/Run Configuration",
  component: RunConfiguration,
  render: (args) => <RunConfiguration key={String(args.readOnly)} {...args} />,
  tags: ["autodocs"],
  args: { readOnly: false },
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "A check-run form composed from Card, Label, Input, Textarea, and Button. Invalid submissions focus the required field. A live status confirms saves within the preview.",
      },
    },
  },
} satisfies Meta<typeof RunConfiguration>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ReadOnly: Story = { args: { readOnly: true } };

export const ValidationAndSave: Story = {
  play: async ({ canvas, userEvent, step }) => {
    const name = canvas.getByRole("textbox", { name: "Run name" });
    const save = canvas.getByRole("button", { name: "Save configuration" });

    await step("Find and correct the required field", async () => {
      await userEvent.click(save);
      await expect(name).toHaveFocus();
      await expect(name).toBeInvalid();
      await expect(name).toHaveAccessibleDescription("Enter a run name.");
      await userEvent.type(name, "Workspace checks");
    });

    await step("Save the configuration with the keyboard", async () => {
      await userEvent.tab();
      await userEvent.type(
        canvas.getByRole("textbox", { name: "Notes (optional)" }),
        "Review before opening a PR.",
      );
      await userEvent.tab();
      await expect(save).toHaveFocus();
      await userEvent.keyboard("{Enter}");
      await expect(name).toBeValid();
      await expect(canvas.getByRole("status")).toHaveTextContent(
        "Saved configuration for “Workspace checks”.",
      );
    });
  },
};
