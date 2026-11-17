export interface WordmarkProps {
  logo: string;
  name: string;
}

export function Wordmark({ logo, name }: WordmarkProps) {
  return (
    <div className="flex items-center gap-3 text-xl leading-[normal] font-[650]">
      <img src={logo} alt="" width={36} height={36} />
      {name}
    </div>
  );
}
