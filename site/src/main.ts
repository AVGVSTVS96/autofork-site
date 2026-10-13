const page = document.querySelector<HTMLElement>(".page")!
const rail = document.querySelector<SVGSVGElement>("svg.rail")!
const NS = "http://www.w3.org/2000/svg"

const releases = ["v0.0.43", "v0.0.44", "v0.0.45"]

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
  const T = navX + Math.min(34, railW * 0.3)
  const B = pad - Math.min(40, railW * 0.34)

  const fork = one("[data-fork]"), you = one("[data-you]"), ask = one("[data-join]"), sub = one(".sub"), note = one(".note")
  const top = one("nav").h + 8
  const end = one("footer").y - 24
  const y1 = fork.y + fork.h * 0.55, y2 = you.y + you.h * 0.55

  rail.replaceChildren()
  page.querySelectorAll(".rail-tag").forEach((t) => t.remove())
  const el = (tag: string, attrs: Record<string, string | number>) => {
    const n = document.createElementNS(NS, tag)
    for (const k in attrs) n.setAttribute(k, String(attrs[k]))
    rail.append(n)
    return n
  }

  const bend = (y2 - y1) * 0.55
  el("path", { class: "trunk", d: `M${T} ${top}V${end}` })
  el("path", { class: "yours", d: `M${T} ${y1}C${T} ${y1 + bend} ${B} ${y2 - bend} ${B} ${y2}V${end}` })

  const ticks: [number, string][] = [
    [Math.max(fork.y - 64, top + 22), releases[0]],
    [sub.y + 12, releases[1]],
    [note.y + note.h + 48, releases[2]],
  ]
  for (const [y, label] of ticks) {
    el("line", { class: "tick", x1: T - 8, x2: T + 8, y1: y, y2: y })
    if (y > y2) {
      el("path", { class: "link", d: `M${T + 10} ${y}H${B - 6}` })
      el("circle", { class: "dot", cx: B, cy: y, r: 4.5 })
    }
    const tag = document.createElement("span")
    tag.className = "rail-tag"
    tag.textContent = label
    page.append(tag)
    const left = T - 16 - tag.offsetWidth
    if (left < 6) tag.remove()
    else Object.assign(tag.style, { top: `${y}px`, left: `${left}px` })
  }

  el("circle", { class: "ring", cx: T, cy: y1, r: 8 })
  el("circle", { class: "dot", cx: B, cy: y2, r: 8 })
  el("path", { class: "yours", d: `M${B} ${ask.y + ask.h / 2}H${ask.x - 2}` })
  el("circle", { class: "dot", cx: B, cy: ask.y + ask.h / 2, r: 6 })

  for (const h of document.querySelectorAll("[data-node]")) {
    const r = at(h)
    const lh = parseFloat(getComputedStyle(h).lineHeight) || r.h
    const y = r.y + Math.min(lh, r.h) * 0.55
    el("path", { class: "yours", d: `M${B} ${y}H${r.x - 16}` })
    el("circle", { class: "dot", cx: B, cy: y, r: 6 })
  }
}

let frame = 0
const redraw = () => {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(draw)
}
document.fonts.ready.then(redraw)
new ResizeObserver(redraw).observe(page)

const ask = document.querySelector<HTMLFormElement>("[data-join]")!
ask.addEventListener("submit", () => {
  const input = ask.querySelector("input")!
  if (!input.value.trim()) input.value = input.placeholder
})

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-copy]")) {
  button.addEventListener("click", async () => {
    await navigator.clipboard.writeText(button.dataset.copy ?? "")
    button.textContent = "Copied"
    setTimeout(() => (button.textContent = "Copy"), 1400)
  })
}
