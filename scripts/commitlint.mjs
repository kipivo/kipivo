import lint from "@commitlint/lint";
import { $ } from "bun";
import { parseArgs } from "node:util";

const rules = {
  "body-leading-blank": [1, "always"],
  "body-max-line-length": [2, "always", 100],
  "footer-leading-blank": [1, "always"],
  "footer-max-line-length": [2, "always", 100],
  "header-max-length": [2, "always", 100],
  "header-trim": [2, "always"],
  "scope-format": [2, "always"],
  "subject-case": [2, "never", ["sentence-case", "start-case", "pascal-case", "upper-case"]],
  "subject-empty": [2, "never"],
  "subject-full-stop": [2, "never", "."],
  "type-case": [2, "always", "lower-case"],
  "type-empty": [2, "never"],
  "type-enum": [
    2,
    "always",
    ["build", "chore", "ci", "docs", "feat", "fix", "perf", "refactor", "revert", "style", "test"],
  ],
};

// Allow digits within words so scopes such as e2e pass.
const scopeFormat = ({ scope }) => [
  !scope || scope.split(/[/\\,] ?/).every((part) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(part)),
  "scope must use lowercase letters and digits with hyphens between words",
];

const parserOpts = {
  headerPattern: /^(\w*)(?:\((.*)\))?!?: (.*)$/,
  breakingHeaderPattern: /^(\w*)(?:\((.*)\))?!: (.*)$/,
  headerCorrespondence: ["type", "scope", "subject"],
  noteKeywords: ["BREAKING CHANGE", "BREAKING-CHANGE"],
  revertPattern: /^(?:Revert|revert:)\s"?([\s\S]+?)"?\s*This reverts commit (\w*)\./i,
  revertCorrespondence: ["header", "hash"],
  issuePrefixes: ["#"],
};

const usage = "Usage: bun run commitlint [--edit <file> | --from <ref> [--to <ref>]]";

async function readInput({ edit, from, to }) {
  if (edit !== undefined) {
    if (from !== undefined || to !== undefined) {
      throw new Error("--edit cannot be combined with --from or --to");
    }
    const comment = await $`git config --get core.commentChar`.quiet().nothrow();
    return { messages: [await Bun.file(edit).text()], commentChar: comment.text().trim() || "#" };
  }

  if (from !== undefined || to !== undefined) {
    if (from !== undefined && from === to) {
      throw new Error("--from and --to must specify different endpoints.");
    }
    const end = to ?? "HEAD";
    if (from !== undefined) {
      const base = await $`git merge-base -- ${from} ${end}`.quiet().nothrow();
      if (base.exitCode !== 0) {
        throw new Error(
          base.stderr.toString().trim() ||
            `No merge base between '${from}' and '${end}'. Fetch more history if this is a shallow clone.`,
        );
      }
    }
    const range = from === undefined ? end : `${from}..${end}`;
    const log =
      await $`git log --no-show-signature --format=%B -z --end-of-options ${range} --`.quiet();
    return { messages: log.text().split("\0") };
  }

  const message = process.stdin.isTTY ? "" : await Bun.stdin.text();
  if (!message.trim()) throw new Error(`Supply a commit message on stdin. ${usage}`);
  return { messages: [message] };
}

try {
  const { values } = parseArgs({
    options: {
      edit: { type: "string" },
      from: { type: "string" },
      to: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    console.log(usage);
  } else {
    const { messages, commentChar } = await readInput(values);
    const options = {
      parserOpts: { ...parserOpts, commentChar },
      plugins: [{ rules: { "scope-format": scopeFormat } }],
    };
    for (const message of messages) {
      if (!message.trim()) continue;
      const { valid, errors, warnings } = await lint(message, rules, options);
      const problems = [...errors, ...warnings];
      if (problems.length === 0) continue;

      console.error(`commitlint: ${message.split("\n", 1)[0]}`);
      for (const problem of problems) {
        const level = problem.level === 2 ? "error" : "warning";
        console.error(`  ${level}: ${problem.message} [${problem.name}]`);
      }
      if (!valid) process.exitCode = 1;
    }
  }
} catch (error) {
  console.error(`commitlint: ${error.stderr?.toString().trim() || error.message}`);
  process.exitCode = 1;
}
