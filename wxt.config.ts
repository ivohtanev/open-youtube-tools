import { defineConfig } from "wxt";

export default defineConfig({
  srcDir: "src",
  manifestVersion: 3,
  manifest: {
    name: "Open YouTube Tools",
    permissions: ["storage"],
    description:
      "Small, modular tools for a more comfortable YouTube experience.",
  },
});
