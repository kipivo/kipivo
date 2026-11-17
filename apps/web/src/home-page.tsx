import logo from "../../../assets/logo.svg?no-inline";

export function HomePage() {
  return (
    <main className="home">
      <div className="wordmark">
        <img src={logo} alt="" width={36} height={36} />
        Kipivo
      </div>
      <h1>From spark to done.</h1>
      <p>
        Kipivo gives developers AI bots that understand their projects, do the work, and show what
        they did.
      </p>
    </main>
  );
}
