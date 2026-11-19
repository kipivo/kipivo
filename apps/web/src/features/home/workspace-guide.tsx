const questions = [
  [
    "Can I run a check on the hosted website?",
    "No. Checks run against your checkout on your machine. The browser runs page is only available when you start the Web development server locally; the CLI works without that server.",
  ],
  [
    "What happens if I restart the runner?",
    "Completed runs and their logs stay in local SQLite history. If a check was interrupted, the runner marks it as failed on restart. Submit a new check when you’re ready to retry.",
  ],
  [
    "Who can manage workspace accounts?",
    "Members can manage their own account settings. Administrators can also open the account directory to find a teammate and change their role. Signing up does not grant administrator access.",
  ],
  [
    "How do I connect from my phone?",
    "In the Kipivo mobile app, set the workspace address to your Web or gateway address. You can test the connection, then open the workspace in your browser to sign in.",
  ],
];

export function WorkspaceGuide() {
  return (
    <section
      id="workspace-guide"
      aria-labelledby="guide-title"
      tabIndex={-1}
      className="grid scroll-mt-6 items-start gap-7 border-t border-border py-12 md:grid-cols-[0.85fr_1.15fr] md:gap-12 lg:py-16"
    >
      <div>
        <h2
          id="guide-title"
          className="text-balance text-4xl font-semibold tracking-tight lg:text-5xl"
        >
          Workspace guide
        </h2>
        <p className="mt-4 max-w-[34ch] leading-relaxed text-muted-foreground">
          Where your checks run, what gets saved, and how to share access.
        </p>
      </div>
      <div className="divide-y divide-border border-y border-border">
        {questions.map(([question, answer]) => (
          <details key={question}>
            <summary className="control-focus cursor-pointer rounded-sm py-4 font-semibold marker:text-primary">
              <span className="pl-1">{question}</span>
            </summary>
            <p className="max-w-[62ch] pb-5 text-sm leading-relaxed text-muted-foreground">
              {answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
