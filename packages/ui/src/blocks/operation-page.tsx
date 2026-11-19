import type { ReactNode } from "react";
import { Page, PageTitle } from "./page";

export function OperationPage({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Page className="py-7 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b border-border pb-5 sm:pb-6">
        <div className="min-w-0">
          <PageTitle className="text-3xl leading-tight tracking-tight sm:text-4xl">
            {title}
          </PageTitle>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
        {action}
      </div>
      <div className="min-w-0 pt-5 sm:pt-6">{children}</div>
    </Page>
  );
}
