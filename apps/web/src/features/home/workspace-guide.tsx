import { m } from "@kipivo/i18n/messages";
const questions = [
  ["hosted", m.homeHostedQuestion, m.homeHostedAnswer],
  ["restart", m.homeRestartQuestion, m.homeRestartAnswer],
  ["accounts", m.homeAccountsQuestion, m.homeAccountsAnswer],
  ["phone", m.homePhoneQuestion, m.homePhoneAnswer],
] as const;

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
          {m.homeGuide()}
        </h2>
        <p className="mt-4 max-w-[34ch] leading-relaxed text-muted-foreground">
          {m.homeGuideIntro()}
        </p>
      </div>
      <div className="divide-y divide-border border-y border-border">
        {questions.map(([id, question, answer]) => (
          <details key={id}>
            <summary className="control-focus cursor-pointer rounded-sm py-4 font-semibold marker:text-primary">
              <span className="pl-1">{question()}</span>
            </summary>
            <p className="max-w-[62ch] pb-5 text-sm leading-relaxed text-muted-foreground">
              {answer()}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
