export function InitialsAvatar({ name }: { name: string }) {
  const initials = name
    .trim()
    .split(/\s+/u)
    .slice(0, 2)
    .map((word) => Array.from(word)[0])
    .join("");
  return (
    <span
      aria-hidden="true"
      className="inline-grid size-8 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold text-foreground uppercase"
    >
      {initials || "?"}
    </span>
  );
}
