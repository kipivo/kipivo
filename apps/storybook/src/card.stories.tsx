import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@kipivo/ui/components/card";
import { Button } from "@kipivo/ui/components/button";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = { title: "Components/Card", component: Card } satisfies Meta<typeof Card>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-80 max-w-full">
      <CardHeader>
        <CardTitle>Project checks</CardTitle>
        <CardDescription>Review the latest local verification.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm">No runs yet. Start a check to see its output here.</p>
      </CardContent>
      <CardFooter>
        <Button>Run checks</Button>
      </CardFooter>
    </Card>
  ),
};
