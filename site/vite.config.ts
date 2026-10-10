import { readFileSync } from "node:fs";
import { defineConfig } from "vite-plus";

const read = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));

type Fork = { repo: string; name: string; upstream: string; patches: number; upstreamCommitsAbsorbed: number; heals: number; firstSync: string; lastGreenSync: string };

const month = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

function wordmark() {
  const { w, h, word, mark } = read("../brand/logo/wordmark-paths.json");
  const u = mark.s / 32;
  const f = (n: number) => +n.toFixed(2);
  const r = (x: number, y: number, rw: number, rh: number, c: string) =>
    `<rect class="${c}" x="${f(mark.x + x * u)}" y="${f(mark.y + y * u)}" width="${f(rw * u)}" height="${f(rh * u)}"/>`;
  return `<symbol id="wordmark" viewBox="0 0 ${w} ${h}">${r(3, 1, 26, 5.5, "wm-del")}${r(3, 18.5, 26, 5.5, "wm-add")}${r(13.25, 10, 5.5, 22, "wm-add")}<path fill="currentColor" d="${word}"/></symbol>`;
}

function ledger(forks: Fork[]) {
  return forks
    .map(
      (fork) => `<tr>
  <td><a href="https://github.com/${fork.repo}">${fork.repo.split("/")[1]}</a><span class="up">on ${fork.upstream}</span></td>
  <td class="n" data-l="patches">${fork.patches}</td>
  <td class="n" data-l="upstream commits">${fork.upstreamCommitsAbsorbed}</td>
  <td class="n heals${fork.heals ? "" : " zero"}" data-l="heals">${fork.heals}</td>
  <td class="n" data-l="first sync">${month(fork.firstSync)}</td>
  <td class="n" data-l="last green">${month(fork.lastGreenSync)}</td>
</tr>`,
    )
    .join("\n");
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
          .replace("<!--forks-->", ledger(facts.forks))
          .replace(/\{\{([\w.]+)\}\}/g, (_, path) => String(get(path) ?? `{{${path}}}`));
      },
    },
  ],
});
