import { Button } from "@kipivo/ui/components/button";
import { Component, type ReactNode } from "react";

export class PreviewBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div
        role="alert"
        className="grid justify-items-start gap-3 rounded-xl border border-border bg-card p-6"
      >
        <h2 className="font-semibold">The example could not load</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Check your connection and reload to try again. The usage and guidance are still available
          below.
        </p>
        <Button variant="outline" onClick={() => location.reload()}>
          Reload page
        </Button>
      </div>
    );
  }
}
