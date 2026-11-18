import { addons } from "storybook/manager-api";

addons.setConfig({
  layoutCustomisations: {
    showPanel: (state, defaultValue) =>
      state.storyId === "foundations-theme--palette" ? false : defaultValue,
  },
});
