import { readFileSync } from "node:fs";
import { defineConfig } from "vite-plus";

const read = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));

function wordmark() {
  const { w, h, word, mark } = read("../brand/logo/wordmark-paths.json");
  const u = mark.s / 32;
  const f = (n: number) => +n.toFixed(2);
  const r = (x: number, y: number, rw: number, rh: number, c: string) =>
    `<rect class="${c}" x="${f(mark.x + x * u)}" y="${f(mark.y + y * u)}" width="${f(rw * u)}" height="${f(rh * u)}"/>`;
  return `<symbol id="wordmark" viewBox="0 0 ${w} ${h}">${r(3, 1, 26, 5.5, "wm-del")}${r(3, 18.5, 26, 5.5, "wm-add")}${r(13.25, 10, 5.5, 22, "wm-add")}<path fill="currentColor" d="${word}"/></symbol>`;
}

export default defineConfig({
  fmt: { ignorePatterns: ["*.html"] },
  plugins: [
    {
      name: "facts",
      transformIndexHtml(html) {
        const facts = read("../copy/facts.json");
        const get = (path: string) => path.split(".").reduce((at, key) => at?.[key], facts);
        return html
          .replace("<!--wordmark-->", wordmark())
          .replace(/\{\{([\w.]+)\}\}/g, (_, path) => String(get(path) ?? `{{${path}}}`));
      },
    },
  ],
});
