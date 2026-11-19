export function CommandLine({ line }: { line: string }) {
  return (
    <div className="grid grid-cols-[1ch_minmax(0,1fr)] items-baseline gap-2.5 font-mono text-[13px]/6 sm:text-sm/6">
      <span aria-hidden="true" className="text-brand-coral select-none">
        $
      </span>
      <code className="min-w-0 wrap-anywhere whitespace-pre-wrap">
        {line.split(/(\bkipivo\b|\$id|\bid(?==))/).map((part, index) => {
          if (part === "kipivo")
            return (
              <span key={index} className="text-brand-amber">
                {part}
              </span>
            );
          if (part === "id" || part === "$id")
            return (
              <span key={index} className="text-sky-300">
                {part}
              </span>
            );
          return part;
        })}
      </code>
    </div>
  );
}
