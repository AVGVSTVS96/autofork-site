import { readFileSync } from "node:fs";
import { defineConfig } from "vite-plus";

const text = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

const site = {
  app: "https://autofork-app.vercel.app",
  siteLive: "https://autofork-blond.vercel.app",
  repoShort: "github.com/AVGVSTVS96/autofork",
};

const logo = () =>
  text("../brand/logo/autofork-classes.svg")
    .replace(/class="(ink|app|you|node)"/g, 'class="logo-$1"')
    .replace(/<svg /, '<svg aria-hidden="true" ');

const icon = (name: string) =>
  text(`../brand/logo/vendor/${name}.svg`)
    .replace(/ (width|height|preserveAspectRatio)="[^"]*"/g, "")
    .replace(/<svg /, '<svg aria-hidden="true" ');

export default defineConfig({
  fmt: { ignorePatterns: ["*.html"] },
  plugins: [
    {
      name: "facts",
      transformIndexHtml(html) {
        const facts = { ...JSON.parse(text("../copy/facts.json")), ...site };
        const get = (path: string) => path.split(".").reduce((at, key) => at?.[key], facts);
        return html
          .replaceAll("<!--logo-->", logo())
          .replace("<!--openai-->", icon("openai"))
          .replace("<!--claude-->", icon("claude"))
          .replace(/\{\{([\w.]+)\}\}/g, (_, path) => {
            const value = get(path);
            if (value === undefined) throw new Error(`site: no fact for {{${path}}}`);
            return String(value);
          });
      },
    },
  ],
});
