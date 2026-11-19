// The built-in kebab-case rule splits digits into words and rejects scopes such as e2e.
const scopeFormat = ({ scope }) => [
  !scope || scope.split(/[/\\,] ?/).every((part) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(part)),
  "scope must use lowercase letters and digits with hyphens between words",
];

export default {
  extends: ["@commitlint/config-conventional"],
  plugins: [{ rules: { "scope-format": scopeFormat } }],
  rules: { "scope-case": [0], "scope-format": [2, "always"] },
};
