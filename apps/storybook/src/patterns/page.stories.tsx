import { Page, PageTitle } from "@kipivo/ui/blocks/page";
import { Button } from "@kipivo/ui/components/button";
import { Input } from "@kipivo/ui/components/input";
import { Label } from "@kipivo/ui/components/label";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Patterns/Page",
  component: PageTitle,
  parameters: { layout: "fullscreen" },
  args: { children: "Sign in to Kipivo", scale: "page" },
  argTypes: { scale: { control: "radio", options: ["page", "display"] } },
  render: (args) => (
    <Page>
      <PageTitle {...args} />
      <div className="mt-8 grid max-w-[26rem] gap-2">
        <Label htmlFor="page-email">Email</Label>
        <Input id="page-email" type="email" autoComplete="email" />
        <Button className="mt-2" type="button">
          Continue
        </Button>
      </div>
    </Page>
  ),
} satisfies Meta<typeof PageTitle>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Form: Story = {};
export const Landing: Story = {
  args: { children: "From spark to done.", scale: "display" },
  render: (args) => (
    <Page>
      <PageTitle {...args} />
      <p className="mt-6 max-w-[43ch] leading-relaxed text-muted-foreground">
        Kipivo gives developers AI bots that understand their projects, do the work, and show what
        they did.
      </p>
    </Page>
  ),
};
