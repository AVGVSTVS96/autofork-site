import { mount } from "./t3.ts"

const NS = "http://www.w3.org/2000/svg"
const still = matchMedia("(prefers-reduced-motion: reduce)").matches
const wait = (ms: number) => new Promise((done) => setTimeout(done, ms))

const svgEl = (parent: Element, tag: string, attrs: Record<string, string | number>) => {
  const n = document.createElementNS(NS, tag)
  for (const k in attrs) n.setAttribute(k, String(attrs[k]))
  parent.append(n)
  return n as SVGGraphicsElement
}

/* The graph down the left edge: their line with its commits and releases, yours branching off at the headline,
   each release merging into yours, and every section hanging off yours. It grows as you scroll. */

const page = document.querySelector<HTMLElement>(".page")!
const graph = document.querySelector<SVGSVGElement>("svg.graph")!
const versions = ["v0.0.41", "v0.0.42", "v0.0.43", "v0.0.44", "v0.0.45", "v0.0.46"]

type Timed = { el: Element; y: number }
let timed: Timed[] = []
let lanes: { el: SVGPathElement; from: number; len: number }[] = []

function draw() {
  const box = page.getBoundingClientRect()
  const at = (el: Element) => {
    const r = el.getBoundingClientRect()
    return { x: r.left - box.left, y: r.top - box.top, w: r.width, h: r.height }
  }
  const one = (selector: string) => at(document.querySelector(selector)!)
  const pad = parseFloat(getComputedStyle(page).paddingLeft)
  const navX = one("nav").x
  const railW = pad - navX
  const T = navX + Math.min(30, railW * 0.28)
  const B = pad - Math.min(38, Math.max(18, railW * 0.32))

  const fork = one("[data-fork]"), you = one("[data-you]"), ask = one("[data-join]"), note = one(".note")
  const top = one("nav").y + one("nav").h + 6
  const end = one("footer").y - 28
  const y1 = fork.y + fork.h * 0.52, y2 = you.y + you.h * 0.52

  graph.replaceChildren()
  page.querySelectorAll(".graph-tag").forEach((t) => t.remove())
  timed = []
  lanes = []

  const nodes = [...document.querySelectorAll("[data-node]")].map((h) => {
    const r = at(h)
    const lh = parseFloat(getComputedStyle(h).lineHeight) || r.h
    return { x: r.x, y: r.y + Math.min(lh, r.h) * 0.55 }
  })

  const releases = [Math.max(top + 30, fork.y - 40), ask.y + ask.h / 2 + 2, note.y + note.h + 70]
  for (let i = 0; i < nodes.length - 1; i++) releases.push((nodes[i]!.y + nodes[i + 1]!.y) / 2 + 40)
  const rels = releases.slice(0, versions.length)

  const lane = (cls: string, d: string, from: number) => {
    const p = svgEl(graph, "path", { class: cls, d }) as SVGPathElement
    lanes.push({ el: p, from, len: p.getTotalLength() })
  }
  lane("theirs", `M${T} ${top}V${end}`, top)
  const bend = (y2 - y1) * 0.6
  svgEl(graph, "path", { class: "yours", d: `M${T} ${y1}C${T} ${y1 + bend} ${B} ${y2 - bend} ${B} ${y2}` })
  lane("yours", `M${B} ${y2}V${end}`, y2)

  const later = (el: Element, y: number) => {
    el.classList.add(el.tagName === "path" ? "draw" : "dot-in")
    if (el.tagName === "path") (el as SVGElement).style.setProperty("--len", String((el as SVGPathElement).getTotalLength()))
    else (el as SVGElement).style.setProperty("--r", `${el.getAttribute("r")}px`)
    timed.push({ el, y })
  }

  // their commits, between the releases
  const busy = [...rels, y1].map((y) => [y - 18, y + 18])
  const gaps = [62, 38, 94, 54, 120, 46, 78, 140, 58]
  for (let y = top + 34, i = 0; y < end - 10; y += gaps[i++ % gaps.length]!) {
    if (busy.some(([a, b]) => y > a! && y < b!)) continue
    later(svgEl(graph, "circle", { class: "c", cx: T, cy: y, r: 3.5 }), y)
  }

  // each release after the branch merges into yours
  rels.forEach((y, i) => {
    if (y > y2 + 10) {
      const m = svgEl(graph, "path", { class: "merge", d: `M${T} ${y}C${T} ${y + 30} ${B} ${y + 14} ${B} ${y + 44}` })
      later(m, y)
      later(svgEl(graph, "circle", { class: "y", cx: B, cy: y + 44, r: 5 }), y + 44)
    }
    later(svgEl(graph, "circle", { class: "rr", cx: T, cy: y, r: 7 }), y)
    const tag = document.createElement("span")
    tag.className = "graph-tag"
    tag.textContent = versions[i]!
    page.append(tag)
    const left = T - 14
    if (left - tag.offsetWidth < 4) tag.remove()
    else {
      Object.assign(tag.style, { top: `${y}px`, left: `${left}px` })
      timed.push({ el: tag, y })
    }
  })

  svgEl(graph, "circle", { class: "rr", cx: T, cy: y1, r: 7 })
  svgEl(graph, "circle", { class: "head", cx: B, cy: y2, r: 8 })
  svgEl(graph, "path", { class: "reach", d: `M${B + 10} ${ask.y + ask.h / 2}H${ask.x - 4}` })

  for (const n of nodes) {
    if (n.x - 18 > B + 8) later(svgEl(graph, "path", { class: "reach", d: `M${B + 8} ${n.y}H${n.x - 18}` }), n.y)
    later(svgEl(graph, "circle", { class: "y", cx: B, cy: n.y, r: 7 }), n.y)
  }

  const band = one(".yours-card")
  for (const c of graph.querySelectorAll("circle")) {
    const x = +c.getAttribute("cx")!, y = +c.getAttribute("cy")!
    if (x > band.x && x < band.x + band.w && y > band.y && y < band.y + band.h) c.classList.add("on-band")
  }
  grow()
}

function grow() {
  const front = scrollY + innerHeight * 0.92 - (page.getBoundingClientRect().top + scrollY)
  for (const l of lanes) {
    const shown = still ? l.len : Math.max(0, Math.min(l.len, front - l.from))
    l.el.style.strokeDasharray = `${l.len}`
    l.el.style.strokeDashoffset = `${l.len - shown}`
  }
  for (const t of timed) if (still || t.y < front) t.el.classList.add("in")
}

let frame = 0
const redraw = () => {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(draw)
}
document.fonts.ready.then(redraw)
new ResizeObserver(redraw).observe(page)
addEventListener("scroll", () => requestAnimationFrame(grow), { passive: true })

/* The composer types out one app and one change at a time. The app sits in a badge, like T3 Code's composer
   chips, and rolls through apps people fork before it lands. */

const examples = [
  { app: "T3 Code", icon: "t3code", change: "always show context usage" },
  { app: "expo-gpt-live", icon: "expo-gpt-live", change: "call my own assistant instead" },
  { app: "herdr", icon: "herdr", change: "show each pane's ID on its border" },
  { app: "Ghostty", icon: "ghostty", change: "keep split sizes after a restart" },
  { app: "Buzz", icon: "buzz", change: "let my agents share files with me" },
  { app: "pi", icon: "pi", change: "show what each turn cost" },
  { app: "cmux", icon: "cmux", change: "ping my phone when an agent finishes" },
  { app: "tmux", icon: "tmux", change: "show each agent's state in the status bar" },
  { app: "UTM", icon: "utm", change: "list running VMs in the menu bar" },
]
type Example = (typeof examples)[number]
const sentence = (e: Example) => `${e.app}, but ${e.change}`

const ask = document.querySelector<HTMLFormElement>("[data-join]")!
const input = ask.querySelector("input")!
const badge = ask.querySelector<HTMLElement>(".badge")!
const reel = ask.querySelector<HTMLElement>(".reel")!
const typed = ask.querySelector<HTMLElement>(".typed")!

const item = (e: Example) => {
  const span = document.createElement("span")
  const img = document.createElement("img")
  img.src = `/repos/${e.icon}.png`
  img.alt = ""
  span.append(img, e.app)
  return span
}
const fit = () => {
  const last = reel.lastElementChild as HTMLElement
  badge.style.width = `${last.offsetWidth + 17}px`
}

let current = 0
let run = 0

async function roll(to: number, token: number) {
  const others = examples.map((_, i) => i).filter((i) => i !== current && i !== to)
  const pass = others.sort(() => Math.random() - 0.5).slice(0, 4)
  const strip = [current, ...pass, to].map((i) => item(examples[i]!))
  reel.style.transition = "none"
  reel.style.transform = "translateY(0)"
  reel.replaceChildren(...strip)
  reel.offsetHeight
  reel.style.transition = "transform 900ms cubic-bezier(.25,.75,.2,1)"
  reel.style.transform = `translateY(${-(strip.length - 1) * 32}px)`
  fit()
  await wait(920)
  if (token !== run) return
  reel.style.transition = "none"
  reel.style.transform = "translateY(0)"
  reel.replaceChildren(item(examples[to]!))
  current = to
}

async function type(text: string, token: number) {
  ask.classList.add("typing")
  for (let i = 1; i <= text.length && token === run; i++) {
    typed.textContent = text.slice(0, i)
    await wait(text[i - 1] === " " ? 70 : 28 + Math.random() * 38)
  }
  ask.classList.remove("typing")
}

async function erase(token: number) {
  ask.classList.add("typing")
  while (typed.textContent && token === run) {
    typed.textContent = typed.textContent.slice(0, -2)
    await wait(14)
  }
  ask.classList.remove("typing")
}

async function play() {
  const token = ++run
  ask.classList.add("live")
  if (still) {
    typed.textContent = `but ${examples[current]!.change}`
    return
  }
  await wait(typed.textContent ? 0 : 700)
  while (token === run) {
    if (!typed.textContent) await type(`but ${examples[current]!.change}`, token)
    await wait(2600)
    if (token !== run) return
    await erase(token)
    if (token !== run) return
    await roll((current + 1) % examples.length, token)
    await wait(160)
  }
}

const stop = () => {
  if (!ask.classList.contains("live")) return
  run++
  ask.classList.remove("live", "typing")
  input.placeholder = sentence(examples[current]!)
}
reel.replaceChildren(item(examples[0]!))
document.fonts.ready.then(fit)
input.addEventListener("focus", stop)
input.addEventListener("blur", () => {
  if (input.value) return
  setTimeout(() => {
    if (document.activeElement !== input && !input.value) {
      typed.textContent = ""
      void play()
    }
  }, 1400)
})
ask.addEventListener("submit", () => {
  if (!input.value.trim()) input.value = sentence(examples[current]!)
})
void play()

/* It keeps what you meant: three releases play in turn while the section is on screen. */

const story = document.querySelector<HTMLElement>("[data-story]")!
const rels = [...story.querySelectorAll<HTMLElement>(".rel")]
const fill = story.querySelector<HTMLElement>(".wire .fill")!
let showing = false
let loop = 0

const wide = () => matchMedia("(min-width: 861px)").matches

const reset = () => {
  rels.forEach((r) => r.classList.remove("playing", "played", "seen", "on"))
  fill.style.width = "0px"
  void story.offsetWidth
}

async function tell() {
  const token = ++loop
  reset()
  while (showing && token === loop) {
    for (const [i, rel] of rels.entries()) {
      if (!showing || token !== loop) return
      rels.forEach((r, j) => r.classList.toggle("on", j === i))
      rel.classList.add("playing", "played")
      const tag = rel.querySelector<HTMLElement>(".tag")!
      fill.style.width = `${rel.offsetLeft + tag.offsetWidth}px`
      await wait(i === 0 ? 2600 : 3800)
      rel.classList.remove("playing")
      rel.classList.add("seen")
    }
    await wait(2200)
    if (!showing || token !== loop) return
    reset()
    await wait(900)
  }
}

if (still) rels.forEach((r) => r.classList.add("played", "on"))
else
  new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!wide()) {
          if (entry.isIntersecting) rels.forEach((r) => r.classList.add("played", "on"))
          continue
        }
        const was = showing
        showing = entry.isIntersecting
        if (showing && !was) void tell()
      }
    },
    { threshold: 0.45 },
  ).observe(story)

/* How it got here, drawn as a graph: two first tries, experimental forks off to the side, and autofork. */

const lineage = document.querySelector<HTMLElement>("[data-lineage]")!
const links: Record<string, string> = { "pi-patcher": lineage.dataset.pi!, "PATCH.md": lineage.dataset.patchmd! }

function history() {
  const W = lineage.clientWidth
  const tall = W < 640
  lineage.replaceChildren()
  const s = svgEl(lineage, "svg", {}) as unknown as SVGSVGElement

  const main = [
    { name: "pi-patcher", when: "May", at: 0.03 },
    { name: "PATCH.md", when: "June", at: 0.22 },
    { name: "autofork", when: "October", at: 0.97, end: true },
  ]
  const exp = [
    { name: "herdr", when: "July", at: 0.44 },
    { name: "Claude Code plugins", when: "Oct 4", at: 0.6 },
    { name: "Buzz", when: "Oct 6", at: 0.73 },
    { name: "T3 Code", when: "Oct 10", at: 0.84 },
  ]
  const label = (parent: Element, x: number, y: number, text: string, cls = "", anchor = "start") => {
    const t = svgEl(parent, "text", { x, y, class: cls, "text-anchor": anchor })
    t.textContent = text
    return t
  }
  const linked = (name: string) => {
    if (!links[name]) return s
    const a = svgEl(s, "a", { href: links[name]! })
    return a
  }

  if (!tall) {
    const H = 220, M = 64, E = 150
    s.setAttribute("viewBox", `0 0 ${W} ${H}`)
    const x = (f: number) => 8 + f * (W - 16)
    const out = x(0.31), back = x(0.92)
    svgEl(s, "path", { class: "main", d: `M${x(0)} ${M}H${x(1)}` })
    svgEl(s, "path", { class: "exp", d: `M${out} ${M}C${out + 40} ${M} ${out + 30} ${E} ${out + 80} ${E}H${back - 80}C${back - 30} ${E} ${back - 40} ${M} ${back} ${M}` })
    label(s, out + 84, E - 16, "experimental forks", "group")
    for (const m of main) {
      const g = linked(m.name)
      const anchor = m.end ? "end" : "start"
      const lx = m.end ? x(m.at) + 8 : x(m.at) - 8
      svgEl(s, "circle", { class: m.end ? "n end" : "n", cx: x(m.at), cy: M, r: m.end ? 9 : 7 })
      label(g, lx, M - 22, m.name, "", anchor)
      label(s, lx, M + 32, m.when, "when", anchor)
    }
    for (const e of exp) {
      svgEl(s, "circle", { class: "e", cx: x(e.at), cy: E, r: 6 })
      label(s, x(e.at), E + 28, e.name, "small", "middle")
      label(s, x(e.at), E + 46, e.when, "when", "middle")
    }
    s.setAttribute("height", String(H))
  } else {
    const items = [
      { ...main[0]!, lane: 0 },
      { ...main[1]!, lane: 0 },
      ...exp.map((e) => ({ ...e, lane: 1 })),
      { ...main[2]!, lane: 0 },
    ]
    const step = 58, X = 10, L = 46, H = items.length * step + 10
    s.setAttribute("viewBox", `0 0 ${W} ${H}`)
    s.setAttribute("height", String(H))
    const y = (i: number) => 16 + i * step
    const out = y(1) + 24, back = y(items.length - 1) - 24
    svgEl(s, "path", { class: "main", d: `M${X} ${y(0)}V${y(items.length - 1)}` })
    svgEl(s, "path", { class: "exp", d: `M${X} ${out}C${X} ${out + 20} ${L} ${out + 10} ${L} ${out + 34}V${back - 34}C${L} ${back - 10} ${X} ${back - 20} ${X} ${back}` })
    items.forEach((it, i) => {
      const cx = it.lane ? L : X
      svgEl(s, "circle", { class: it.lane ? "e" : "end" in it && it.end ? "n end" : "n", cx, cy: y(i), r: it.lane ? 6 : 7 })
      const g = it.lane ? s : linked(it.name)
      label(g, cx + 20, y(i) + 5, it.name, it.lane ? "small" : "")
      label(s, W - 2, y(i) + 5, it.when, "when", "end")
    })
  }
}
new ResizeObserver(() => {
  history()
  lineage.querySelectorAll("path").forEach((p) => p.setAttribute("pathLength", "1"))
  lineage.querySelectorAll("circle").forEach((c, i) => {
    c.style.setProperty("--r", `${c.getAttribute("r")}px`)
    c.style.setProperty("--d", `${300 + i * 140}ms`)
  })
}).observe(lineage)
if (still) lineage.classList.add("in")
else new IntersectionObserver(([e]) => e!.isIntersecting && lineage.classList.add("in"), { threshold: 0.4 }).observe(lineage)

mount(document.querySelector("[data-t3]"))

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-copy]")) {
  button.addEventListener("click", async () => {
    await navigator.clipboard.writeText(button.dataset.copy ?? "")
    button.textContent = "Copied"
    setTimeout(() => (button.textContent = "Copy"), 1400)
  })
}
