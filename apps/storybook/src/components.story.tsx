import { defineStory } from "./story";
import {
  BadgeExample,
  ButtonExample,
  CardExample,
  DialogExample,
  DropdownMenuExample,
  InputExample,
  LabelExample,
  TextareaExample,
  TooltipExample,
  WordmarkExample,
} from "./examples";

export const button = defineStory({
  Component: ButtonExample,
  args: [
    {
      variant: "Primary",
      initial: {
        label: "Run checks",
        variant: "default",
        size: "default",
        disabled: false,
        loading: false,
      },
    },
    {
      variant: "Secondary",
      initial: {
        label: "View logs",
        variant: "secondary",
        size: "default",
        disabled: false,
        loading: false,
      },
    },
    {
      variant: "Outline",
      initial: {
        label: "View logs",
        variant: "outline",
        size: "default",
        disabled: false,
        loading: false,
      },
    },
    {
      variant: "Ghost",
      initial: {
        label: "View logs",
        variant: "ghost",
        size: "default",
        disabled: false,
        loading: false,
      },
    },
    {
      variant: "Destructive",
      initial: {
        label: "Delete run",
        variant: "destructive",
        size: "default",
        disabled: false,
        loading: false,
      },
    },
    {
      variant: "Link",
      initial: {
        label: "View logs",
        variant: "link",
        size: "default",
        disabled: false,
        loading: false,
      },
    },
    {
      variant: "Disabled",
      initial: {
        label: "Waiting for runner",
        variant: "default",
        size: "default",
        disabled: true,
        loading: false,
      },
    },
    {
      variant: "Loading",
      initial: {
        label: "Run checks",
        variant: "default",
        size: "default",
        disabled: false,
        loading: true,
      },
    },
  ],
});

export const input = defineStory({
  Component: InputExample,
  args: [
    {
      variant: "Default",
      initial: {
        label: "Task name",
        placeholder: "Check the project",
        disabled: false,
        required: false,
        invalid: false,
      },
    },
    {
      variant: "Invalid",
      initial: {
        label: "Task name",
        placeholder: "Check the project",
        disabled: false,
        required: true,
        invalid: true,
      },
    },
    {
      variant: "Disabled",
      initial: {
        label: "Task name",
        placeholder: "Waiting for runner",
        disabled: true,
        required: false,
        invalid: false,
      },
    },
  ],
});

export const textarea = defineStory({
  Component: TextareaExample,
  args: [
    {
      variant: "Default",
      initial: {
        label: "Task description",
        placeholder: "Describe the checks to run",
        disabled: false,
        required: false,
        invalid: false,
      },
    },
    {
      variant: "Invalid",
      initial: {
        label: "Task description",
        placeholder: "Describe the checks to run",
        disabled: false,
        required: true,
        invalid: true,
      },
    },
    {
      variant: "Disabled",
      initial: {
        label: "Task description",
        placeholder: "Waiting for runner",
        disabled: true,
        required: false,
        invalid: false,
      },
    },
  ],
});

export const label = defineStory({
  Component: LabelExample,
  args: { initial: { label: "Project name" } },
});
export const badge = defineStory({
  Component: BadgeExample,
  args: [
    { variant: "Passed", initial: { label: "Passed", variant: "secondary" } },
    { variant: "Running", initial: { label: "Running", variant: "default" } },
    { variant: "Failed", initial: { label: "Failed", variant: "destructive" } },
  ],
});
export const card = defineStory({
  Component: CardExample,
  args: {
    initial: {
      title: "Project checks",
      description: "Review the latest local verification.",
      compact: false,
    },
  },
});
export const dialog = defineStory({
  Component: DialogExample,
  args: {
    initial: {
      title: "Delete this run?",
      description: "This removes the run and its saved logs. You cannot undo this action.",
    },
  },
});
export const dropdownMenu = defineStory({
  Component: DropdownMenuExample,
  args: { initial: { label: "Run actions", retryDisabled: true } },
});
export const tooltip = defineStory({
  Component: TooltipExample,
  args: { initial: { label: "Run checks", description: "Run the project's configured checks." } },
});
export const wordmark = defineStory({
  Component: WordmarkExample,
  args: { initial: { name: "Kipivo" } },
});
