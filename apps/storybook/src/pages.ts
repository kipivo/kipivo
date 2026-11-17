import { lazy, type ComponentType } from "react";

function story(name: keyof typeof import("./components.story")) {
  return lazy(async () => ({ default: (await import("./components.story"))[name].WithControl }));
}

interface Page {
  id: string;
  title: string;
  description: string;
  Story: ComponentType;
  code: string;
  notes: string[];
}

export const pages: Page[] = [
  {
    id: "button",
    title: "Button",
    Story: story("button"),
    description: "Actions with a clear hierarchy, from the primary action to a destructive choice.",
    code: `import { Button, buttonVariants } from "@kipivo/ui/components/button";

<Button onClick={runChecks}>Run checks</Button>
<Button variant="outline">View logs</Button>
<Button disabled aria-busy>Running checks…</Button>
<a href="/runs" className={buttonVariants({ variant: "link" })}>View runs</a>`,
    notes: [
      "Use Button for actions and a real link for navigation.",
      "Icon sizes are icon-xs, icon-sm, icon, and icon-lg. Give icon-only buttons an accessible name.",
      "For a loading action, combine disabled, aria-busy, and a visible progress label.",
    ],
  },
  {
    id: "input",
    title: "Input",
    Story: story("input"),
    description: "A single line of text, with a visible label and an explicit error state.",
    code: `import { Input } from "@kipivo/ui/components/input";
import { Label } from "@kipivo/ui/components/label";

<Label htmlFor="task-name">Task name</Label>
<Input id="task-name" placeholder="Check the project" />

// Invalid state
<Input id="retry-name" aria-invalid aria-describedby="retry-error" />
<p id="retry-error">Enter a task name to continue.</p>`,
    notes: [
      "Connect Label.htmlFor to the input id. Use React.useId when the field can appear more than once.",
      "Connect error text with aria-describedby and set aria-invalid. A placeholder does not replace the label.",
    ],
  },
  {
    id: "textarea",
    title: "Textarea",
    Story: story("textarea"),
    description: "Longer descriptions with the same labeling and validation behavior as Input.",
    code: `import { Textarea } from "@kipivo/ui/components/textarea";
import { Label } from "@kipivo/ui/components/label";

<Label htmlFor="description">Task description</Label>
<Textarea id="description" rows={4} placeholder="Describe the checks to run" />`,
    notes: [
      "Keep a visible label and connect validation messages with aria-describedby.",
      "Keep resizing available when users may enter longer text. Use disabled only when editing is unavailable.",
    ],
  },
  {
    id: "label",
    title: "Label",
    Story: story("label"),
    description: "A visible field name that also moves focus to its associated control.",
    code: `import { Label } from "@kipivo/ui/components/label";
import { Input } from "@kipivo/ui/components/input";

<Label htmlFor="project-name">Project name</Label>
<Input id="project-name" />`,
    notes: [
      "Use a unique id for each field and point htmlFor at that id.",
      "Put instructions and validation beside the field. Keep the label short and specific.",
    ],
  },
  {
    id: "badge",
    title: "Badge",
    Story: story("badge"),
    description: "Compact status text that remains understandable without relying on color.",
    code: `import { Badge } from "@kipivo/ui/components/badge";

<Badge variant="secondary">Passed</Badge>
<Badge variant="default">Running</Badge>
<Badge variant="destructive">Failed</Badge>`,
    notes: [
      "Always name the status in text; color alone does not communicate it.",
      "A badge is noninteractive by default. If it navigates, compose it with a real link using render.",
    ],
  },
  {
    id: "card",
    title: "Card",
    Story: story("card"),
    description:
      "A content surface that groups a title, supporting information, and related actions.",
    code: `import {
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
} from "@kipivo/ui/components/card";
import { Button } from "@kipivo/ui/components/button";

<Card>
  <CardHeader>
    <CardTitle>Project checks</CardTitle>
    <CardDescription>Review the latest local verification.</CardDescription>
  </CardHeader>
  <CardContent>No runs yet.</CardContent>
  <CardFooter><Button>Run checks</Button></CardFooter>
</Card>`,
    notes: [
      "Place actions in explicit buttons or links. Card itself is a content surface.",
      'Use size="sm" for a compact card. Keep headings in the surrounding page hierarchy meaningful.',
    ],
  },
  {
    id: "dialog",
    title: "Dialog",
    Story: story("dialog"),
    description:
      "A focused decision with an accessible title, description, and a clear way to cancel.",
    code: `import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogClose,
} from "@kipivo/ui/components/dialog";
import { Button } from "@kipivo/ui/components/button";

<Dialog>
  <DialogTrigger render={<Button variant="outline" />}>Delete run</DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Delete this run?</DialogTitle>
      <DialogDescription>This cannot be undone.</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
      <DialogClose render={<Button variant="destructive" />}>Delete run</DialogClose>
    </DialogFooter>
  </DialogContent>
</Dialog>`,
    notes: [
      "Provide DialogTitle and DialogDescription. Keep destructive actions separate from Cancel.",
      "Compose triggers with render={<Button />}. Escape dismisses the dialog and returns focus to its trigger.",
    ],
  },
  {
    id: "dropdown-menu",
    title: "Dropdown menu",
    Story: story("dropdownMenu"),
    description: "Related actions in a menu that supports pointer and keyboard navigation.",
    code: `import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@kipivo/ui/components/dropdown-menu";
import { Button } from "@kipivo/ui/components/button";

<DropdownMenu>
  <DropdownMenuTrigger render={<Button variant="outline" />}>Run actions</DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>View logs</DropdownMenuItem>
    <DropdownMenuItem disabled>Retry run</DropdownMenuItem>
    <DropdownMenuItem variant="destructive">Delete run</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>`,
    notes: [
      'Use disabled for unavailable actions and variant="destructive" for a destructive item.',
      "Arrow keys move through the menu. Escape dismisses it and restores focus to the trigger.",
    ],
  },
  {
    id: "tooltip",
    title: "Tooltip",
    Story: story("tooltip"),
    description: "Supplemental information available on hover and keyboard focus.",
    code: `import {
  TooltipProvider, Tooltip, TooltipTrigger, TooltipContent,
} from "@kipivo/ui/components/tooltip";
import { Button } from "@kipivo/ui/components/button";

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger render={<Button variant="outline" />}>Run checks</TooltipTrigger>
    <TooltipContent>Run the project's configured checks.</TooltipContent>
  </Tooltip>
</TooltipProvider>`,
    notes: [
      "Wrap the application in TooltipProvider. This manual already supplies it.",
      "Keep essential instructions visible. The tooltip adds a description; icon-only triggers still need an accessible name.",
    ],
  },
  {
    id: "wordmark",
    title: "Wordmark",
    Story: story("wordmark"),
    description: "The Kipivo symbol and name, kept together as one identity.",
    code: `import { Wordmark } from "@kipivo/ui";
import logo from "./logo.svg";

<Wordmark logo={logo} name="Kipivo" />`,
    notes: [
      "The logo image is decorative because the visible name supplies the text alternative.",
      "Use a real link around the wordmark when it navigates to the home page.",
    ],
  },
];
