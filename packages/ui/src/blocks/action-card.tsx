import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@kipivo/ui/components/card";

type ActionCardProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function ActionCard({ title, description, children }: ActionCardProps) {
  return (
    <Card>
      <CardHeader className="wrap-anywhere">
        <CardTitle>
          <h2>{title}</h2>
        </CardTitle>
        <CardDescription>
          <p>{description}</p>
        </CardDescription>
      </CardHeader>
      <CardContent className="mt-auto flex flex-wrap items-center gap-2">{children}</CardContent>
    </Card>
  );
}
