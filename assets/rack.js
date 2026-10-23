"use strict";

(() => {
  const root = document.documentElement;
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const russian = () => root.classList.contains("ru");

  for (const toggle of document.querySelectorAll("[data-lang-toggle]")) {
    toggle.addEventListener("click", () => {
      const next = !russian();
      root.classList.toggle("ru", next);
      root.lang = next ? "ru" : "en";
      try { localStorage.setItem("steelshell-lang", next ? "ru" : "en"); } catch (error) { return; }
    });
  }

  for (const tape of document.querySelectorAll("[data-tape]")) {
    const text = tape.textContent;
    tape.textContent = "";
    const hidden = document.createElement("span");
    hidden.className = "visually-hidden";
    hidden.textContent = text;
    const shown = document.createElement("span");
    shown.setAttribute("aria-hidden", "true");
    [...text].forEach((char, index) => {
      const span = document.createElement("span");
      span.className = "ch";
      span.textContent = char;
      const seed = (index * 7 + text.length * 3) % 5;
      span.style.transform = `translateY(${(seed - 2) * 0.35}px) rotate(${(seed - 2) * 0.5}deg)`;
      shown.append(span);
    });
    tape.append(hidden, shown);
  }

  const rails = [...document.querySelectorAll("[data-rail]")];
  const bay = document.querySelector(".bay");
  const numberRails = () => {
    const unit = bay.clientWidth / 10.857;
    for (const rail of rails) {
      rail.querySelectorAll(".u-num").forEach((label) => label.remove());
      const height = rail.clientHeight;
      const count = Math.floor(height / unit);
      for (let index = 0; index < count; index++) {
        const label = document.createElement("span");
        label.className = "u-num";
        label.textContent = String(index + 1);
        label.style.top = `${height - (index + 0.5) * unit}px`;
        rail.append(label);
      }
    }
  };

  const log = document.querySelector("[data-log]");
  const activity = [...document.querySelectorAll("[data-activity]")];
  const entries = [
    { en: "↑ host prod-db  rev 117", ru: "↑ хост prod-db  рев 117", led: 0 },
    { en: "↓ android  in sync", ru: "↓ android  синхр.", led: 1 },
    { en: "↓ steelshell cli  in sync", ru: "↓ steelshell cli  синхр.", led: 2 },
    { en: "• agent prod-api  shell_run", ru: "• агент prod-api  shell_run", led: 3 },
    { en: "↑ snippet deploy  rev 118", ru: "↑ сниппет deploy  рев 118", led: 0 },
    { en: "↓ windows  in sync", ru: "↓ windows  синхр.", led: 0 },
    { en: "↑ key deploy-ed25519  rev 119", ru: "↑ ключ deploy-ed25519  рев 119", led: 2 },
    { en: "• agent staging  read_file", ru: "• агент staging  read_file", led: 3 },
  ];
  let step = 0;
  const stamp = () => new Date().toTimeString().slice(0, 8);
  const addEntry = () => {
    const entry = entries[step % entries.length];
    step += 1;
    const line = document.createElement("li");
    line.dataset.en = `${stamp()} ${entry.en}`;
    line.dataset.ru = `${stamp()} ${entry.ru}`;
    line.textContent = russian() ? line.dataset.ru : line.dataset.en;
    log.append(line);
    while (log.children.length > 14) log.firstElementChild.remove();
    const led = activity[entry.led];
    if (led && !calm) {
      led.classList.add("lit");
      setTimeout(() => led.classList.remove("lit"), 380);
    }
  };
  if (log) {
    for (let index = 0; index < 12; index++) addEntry();
    if (!calm) setInterval(addEntry, 2600);
    new MutationObserver(() => {
      for (const line of log.children) line.textContent = russian() ? line.dataset.ru : line.dataset.en;
    }).observe(root, { attributes: true, attributeFilter: ["class"] });
  }

  for (const key of document.querySelectorAll("[data-screen]")) {
    key.addEventListener("click", () => {
      const name = key.dataset.screen;
      document.querySelectorAll("[data-screen]").forEach((other) => other.setAttribute("aria-pressed", String(other === key)));
      document.querySelectorAll("[data-shot]").forEach((shot) => { shot.hidden = shot.dataset.shot !== name; });
      document.querySelectorAll("[data-caption]").forEach((caption) => { caption.hidden = caption.dataset.caption !== name; });
    });
  }

  const row = document.querySelector(".patch-row");
  const svg = document.querySelector("[data-cables]");
  const agent = document.querySelector("[data-agent]");
  const command = document.querySelector("[data-command]");
  const ns = "http://www.w3.org/2000/svg";
  const drawCables = () => {
    if (!row || !svg || !agent) return;
    svg.replaceChildren();
    if (getComputedStyle(svg).display === "none") return;
    const box = row.getBoundingClientRect();
    const from = agent.getBoundingClientRect();
    const ax = from.left + from.width / 2 - box.left;
    const ay = from.bottom - box.top - 4;
    const ports = [...document.querySelectorAll("[data-port]")].filter((port) => port.dataset.state);
    ports.forEach((port, index) => {
      const jack = port.querySelector(".jack").getBoundingClientRect();
      const px = jack.left + jack.width / 2 - box.left;
      const py = jack.bottom - box.top - 4;
      const drop = 22 + index * 7;
      const d = `M${ax},${ay} C${ax},${ay + drop} ${px},${py + drop} ${px},${py}`;
      for (const [cls, extra] of [["cable-shade", ""], ["cable", port.dataset.state]]) {
        const path = document.createElementNS(ns, "path");
        path.setAttribute("d", d);
        path.setAttribute("class", `${cls} ${extra}`.trim());
        svg.append(path);
      }
      for (const x of [ax, px]) {
        const plug = document.createElementNS(ns, "rect");
        plug.setAttribute("x", String(x - 9));
        plug.setAttribute("y", String((x === ax ? ay : py) - 12));
        plug.setAttribute("width", "18");
        plug.setAttribute("height", "14");
        plug.setAttribute("rx", "2");
        plug.setAttribute("class", `plug ${port.dataset.state}`);
        svg.append(plug);
      }
    });
  };
  const cycle = { "": "full", full: "read", read: "" };
  for (const port of document.querySelectorAll("[data-port]")) {
    port.setAttribute("aria-pressed", port.dataset.state ? "true" : "false");
    port.addEventListener("click", () => {
      const next = cycle[port.dataset.state || ""];
      port.dataset.state = next;
      port.setAttribute("aria-pressed", next ? "true" : "false");
      const name = port.dataset.port;
      command.textContent = next === "full"
        ? `steelshell agent allow ${name}`
        : next === "read"
          ? `steelshell agent allow ${name} --read-only`
          : `steelshell agent deny ${name}`;
      drawCables();
    });
  }

  for (const button of document.querySelectorAll("[data-copy]")) {
    button.addEventListener("click", async () => {
      const source = document.getElementById(button.dataset.copy);
      try {
        await navigator.clipboard.writeText(source.textContent.trim());
      } catch (error) {
        const range = document.createRange();
        range.selectNodeContents(source);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        return;
      }
      button.classList.add("done");
      setTimeout(() => button.classList.remove("done"), 1600);
    });
  }

  const relayout = () => { numberRails(); drawCables(); };
  window.addEventListener("resize", relayout);
  window.addEventListener("load", relayout);
  document.fonts && document.fonts.ready.then(relayout);
  relayout();

  const suffixes = { setup: "-setup.exe", zip: "-windows-x64.zip", apk: "-android.apk", "deb-amd64": "_amd64.deb", "deb-arm64": "_arm64.deb" };
  const megabytes = (bytes) => String(Math.max(1, Math.round(bytes / 1048576)));
  const apply = (release, version, attribute) => {
    if (!release) return;
    document.querySelectorAll(`[${attribute}]`).forEach((element) => { element.textContent = version; });
    for (const asset of release.assets || []) {
      for (const [key, suffix] of Object.entries(suffixes)) {
        if (!asset.name.endsWith(suffix)) continue;
        document.querySelectorAll(`[data-download="${key}"]`).forEach((link) => { link.href = asset.browser_download_url; });
        document.querySelectorAll(`[data-size="${key}"]`).forEach((size) => { size.textContent = megabytes(asset.size); });
      }
    }
  };
  fetch("https://api.github.com/repos/steelshell/releases/releases?per_page=30", { headers: { Accept: "application/vnd.github+json" }, cache: "no-store" })
    .then((response) => (response.ok ? response.json() : []))
    .then((releases) => {
      const published = releases.filter((release) => !release.draft && !release.prerelease);
      const app = published.find((release) => /^v\d/.test(release.tag_name));
      const cli = published.find((release) => /^cli-v\d/.test(release.tag_name));
      apply(app, app && app.tag_name.replace(/^v/, ""), "data-app-version");
      apply(cli, cli && cli.tag_name.replace(/^cli-v/, ""), "data-cli-version");
    })
    .catch(() => {});
})();
