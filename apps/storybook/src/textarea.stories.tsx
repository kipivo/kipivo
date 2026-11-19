import type { Meta, StoryObj } from "@storybook/react-vite";
import { TextareaExample } from "./examples";
import { docsFor } from "./documentation";

const meta = {
  title: "Components/Textarea",
  component: TextareaExample,
  tags: ["autodocs"],
  parameters: docsFor("textarea"),
  args: {
    label: "Task description",
    placeholder: "Describe the checks to run",
    disabled: false,
    required: false,
    invalid: false,
  },
} satisfies Meta<typeof TextareaExample>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Invalid: Story = { args: { required: true, invalid: true } };
export const Disabled: Story = { args: { placeholder: "Waiting for runner", disabled: true } };

export const ReadOnly: Story = {
  args: {
    label: "Run summary",
    defaultValue: "Build succeeded.\nAll project checks passed.",
    description: "This summary is generated when the run finishes.",
    readOnly: true,
  },
  parameters: {
    docs: {
      source: {
        code: `import { Label } from "@kipivo/ui/components/label";
import { Textarea } from "@kipivo/ui/components/textarea";

<Label htmlFor="summary">Run summary</Label>
<Textarea
  id="summary"
  defaultValue={summary}
  aria-describedby="summary-help"
  readOnly
/>
<p id="summary-help">This summary is generated when the run finishes.</p>`,
      },
    },
  },
};
