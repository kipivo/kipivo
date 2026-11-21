import { describe, expect, it } from "bun:test";
import { analyzeMessageUsage } from "./i18n-usage";

const ids = ["signInHeading", "credentialEmail", "socialContinueWithProvider"];
const analyze = (sources: string[]) => analyzeMessageUsage(ids, sources);
const importMessages = 'import { m } from "@kipivo/i18n/messages";';

describe("analyzeMessageUsage", () => {
  it("counts property accesses on the default namespace", () => {
    const usage = analyze([`${importMessages}\nm.signInHeading();`]);
    expect(usage).toEqual({
      unused: ["credentialEmail", "socialContinueWithProvider"],
      unknown: [],
      dynamic: false,
    });
  });

  it("follows aliases and string element access", () => {
    const usage = analyze([
      'import { m as t } from "@kipivo/i18n/messages";\nconst label = t["credentialEmail"]();',
    ]);
    expect(usage.unused).toEqual(["signInHeading", "socialContinueWithProvider"]);
    expect(usage.unknown).toEqual([]);
  });

  it("counts destructured and directly imported messages", () => {
    const usage = analyze([
      `${importMessages}\nconst { signInHeading, credentialEmail: email } = m;\n` +
        "signInHeading();\nemail();\n" +
        'import { socialContinueWithProvider } from "@kipivo/i18n/messages";',
    ]);
    expect(usage).toEqual({ unused: [], unknown: [], dynamic: false });
  });

  it("stops reporting unused ids when the namespace escapes", () => {
    const rest = analyze([`${importMessages}\nconst { signInHeading, ...rest } = m;`]);
    expect(rest).toMatchObject({ unused: [], dynamic: true });
    const passed = analyze([`${importMessages}\nregister(m);`]);
    expect(passed).toMatchObject({ unused: [], dynamic: true });
    const spread = analyze([`${importMessages}\nconst copy = { ...m };`]);
    expect(spread).toMatchObject({ unused: [], dynamic: true });
  });

  it("ignores comments and strings", () => {
    const usage = analyze([
      '// m.missing\nconst hint = "m.alsoMissing";\n' + `${importMessages}\nm.signInHeading();`,
    ]);
    expect(usage.unknown).toEqual([]);
    expect(usage.unused).toEqual(["credentialEmail", "socialContinueWithProvider"]);
  });

  it("reports properties the catalog does not define", () => {
    const usage = analyze([`${importMessages}\nm.missing();\nm.signInHeading();`]);
    expect(usage.unknown).toEqual(["missing"]);
  });

  it("ignores files that do not import the catalog", () => {
    const usage = analyze(["const m = { missing: () => 0 };\nm.missing();"]);
    expect(usage).toEqual({
      unused: ids,
      unknown: [],
      dynamic: false,
    });
  });
});
