"use strict";

(() => {
  const root = document.documentElement;
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  for (const toggle of document.querySelectorAll("[data-lang-toggle]")) {
    toggle.addEventListener("click", () => {
      const russian = !root.classList.contains("ru");
      root.classList.toggle("ru", russian);
      root.lang = russian ? "ru" : "en";
      try { localStorage.setItem("steelshell-lang", russian ? "ru" : "en"); } catch (error) { return; }
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
      const labels = button.querySelectorAll("[data-copy-label]");
      const previous = [...labels].map((label) => label.textContent);
      labels.forEach((label) => { label.textContent = label.classList.contains("ru") ? "Скопировано" : "Copied"; });
      button.classList.add("done");
      setTimeout(() => {
        labels.forEach((label, index) => { label.textContent = previous[index]; });
        button.classList.remove("done");
      }, 1600);
    });
  }

  const hosts = [
    { name: "prod-api-1", user: "deploy", address: "10.0.4.12", group: "Production", signIn: "key deploy-ed25519", agents: "full", os: "Ubuntu 24.04.1 LTS", kernel: "6.8.0-45-generic", up: "41 days,  3:12", load: "0.42, 0.38, 0.31", disk: ["78G", "31G", "44G", "42%"], memory: ["7.7Gi", "2.4Gi", "3.1Gi", "5.3Gi"], files: "deploy.sh  logs  node_modules  package.json  src" },
    { name: "prod-api-2", user: "deploy", address: "10.0.4.13", group: "Production", signIn: "key deploy-ed25519", agents: "off", os: "Ubuntu 24.04.1 LTS", kernel: "6.8.0-45-generic", up: "41 days,  3:09", load: "0.31, 0.29, 0.27", disk: ["78G", "29G", "46G", "39%"], memory: ["7.7Gi", "2.1Gi", "3.4Gi", "5.6Gi"], files: "deploy.sh  logs  node_modules  package.json  src" },
    { name: "prod-db", user: "postgres", address: "10.0.4.20", group: "Production", signIn: "key deploy-ed25519", agents: "off", os: "Debian GNU/Linux 12 (bookworm)", kernel: "6.1.0-26-amd64", up: "88 days, 17:40", load: "1.12, 0.97, 0.91", disk: ["480G", "212G", "244G", "47%"], memory: ["31Gi", "22Gi", "1.2Gi", "8.4Gi"], files: "backups  wal-archive" },
    { name: "staging-web", user: "deploy", address: "staging.example.dev", group: "Staging", signIn: "password", agents: "read", os: "Ubuntu 22.04.4 LTS", kernel: "5.15.0-122-generic", up: "6 days, 22:15", load: "0.08, 0.05, 0.01", disk: ["40G", "12G", "26G", "32%"], memory: ["3.8Gi", "1.1Gi", "1.6Gi", "2.5Gi"], files: "current  releases  shared" },
    { name: "homelab-nas", user: "admin", address: "192.168.1.40", group: "Homelab", signIn: "password", agents: "off", os: "Debian GNU/Linux 12 (bookworm)", kernel: "6.1.0-26-amd64", up: "203 days,  9:51", load: "0.21, 0.17, 0.15", disk: ["7.3T", "4.9T", "2.1T", "71%"], memory: ["15Gi", "3.2Gi", "6.0Gi", "11Gi"], files: "media  photos  timemachine" },
    { name: "router", user: "admin", address: "192.168.1.2", group: "Homelab", signIn: "password", agents: "off", os: "OpenWrt 23.05.4", kernel: "5.15.162", up: "12 days,  4:03", load: "0.03, 0.04, 0.00", disk: ["14M", "2.1M", "12M", "15%"], memory: ["238Mi", "61Mi", "120Mi", "158Mi"], files: "" },
  ];

  const live = document.querySelector("[data-live]");
  if (live) {
    const body = live.querySelector("[data-live-body]");
    const list = live.querySelector("[data-live-list]");
    const card = live.querySelector("[data-live-card]");
    const session = live.querySelector("[data-live-session]");
    const keys = live.querySelector("[data-live-keys]");
    const toast = live.querySelector("[data-live-toast]");
    const rows = [...list.querySelectorAll("[data-host]")];
    let selected = 0;
    let connected = null;
    let input = null;
    let history = [];
    let historyAt = 0;
    let toastTimer = 0;

    const escape = (text) => text.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
    const pad = (text, width) => String(text).padEnd(width);
    const clock = () => new Date().toTimeString().slice(0, 8);

    const showToast = (text) => {
      toast.textContent = text;
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { toast.textContent = ""; }, 4000);
    };

    const renderCard = () => {
      const host = hosts[selected];
      const agents = host.agents === "full" ? ["ok", "full access"] : host.agents === "read" ? ["warn", "read only"] : ["off", "off"];
      card.innerHTML =
        `<h3>${host.name}</h3><div class="addr">${host.user}@${host.address}</div>` +
        `<dl><dt>Group</dt><dd>${host.group}</dd><dt>Sign-in</dt><dd>${host.signIn}</dd>` +
        `<dt>System</dt><dd>${host.os}</dd><dt>Host key</dt><dd class="ok">✓ trusted here</dd>` +
        `<dt>AI agents</dt><dd class="${agents[0]}">${agents[1]}</dd></dl>`;
    };

    const select = (index) => {
      selected = (index + hosts.length) % hosts.length;
      rows.forEach((row, at) => {
        row.classList.toggle("is-selected", at === selected);
        row.setAttribute("aria-selected", String(at === selected));
      });
      renderCard();
    };

    const setKeys = (mode) => {
      keys.querySelectorAll("button").forEach((button) => button.remove());
      const make = (action, html, label) => {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.liveAction = action;
        button.innerHTML = html;
        if (label) button.setAttribute("aria-label", label);
        keys.insertBefore(button, toast);
      };
      if (mode === "list") {
        make("connect", "<kbd>⏎</kbd> terminal");
        make("up", "<kbd>↑</kbd>", "Previous host");
        make("down", "<kbd>↓</kbd>", "Next host");
      } else {
        make("exit", "<kbd>^D</kbd> back to hosts");
        make("help", "<kbd>?</kbd> commands");
      }
    };

    const promptText = () => `${connected.user}@${connected.name}:~$`;

    const print = (html) => {
      const line = document.createElement("div");
      line.innerHTML = html;
      session.insertBefore(line, session.lastElementChild);
      session.scrollTop = session.scrollHeight;
    };

    const output = (command) => {
      const host = connected;
      const [name] = command.split(/\s+/);
      switch (command.replace(/\s+/g, " ")) {
        case "": return "";
        case "help": return '<span class="hint">This demo knows: uptime, df -h, free -h, ls, pwd, whoami, hostname, uname -a, date, cat /etc/os-release, clear, exit</span>';
        case "uptime": return ` ${clock()} up ${host.up},  1 user,  load average: ${host.load}`;
        case "df -h": return `Filesystem      Size  Used Avail Use% Mounted on\n/dev/vda1       ${pad(host.disk[0], 5)} ${pad(host.disk[1], 5)} ${pad(host.disk[2], 5)} ${pad(host.disk[3], 4)} /`;
        case "free -h": return `               total        used        free   available\nMem:           ${pad(host.memory[0], 12)}${pad(host.memory[1], 12)}${pad(host.memory[2], 8)}${host.memory[3]}`;
        case "ls": return host.files;
        case "pwd": return host.user === "root" ? "/root" : `/home/${host.user}`;
        case "whoami": return host.user;
        case "hostname": return host.name;
        case "date": return new Date().toString().replace(/ GMT.*$/, "");
        case "uname -a": return `Linux ${host.name} ${host.kernel} #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux`;
        case "cat /etc/os-release": return `PRETTY_NAME="${host.os}"`;
        default: return `<span class="err">${escape(name)}: command not found</span>\n<span class="hint">This is a demo with a few commands. Type help to see them.</span>`;
      }
    };

    const disconnect = () => {
      if (!connected) return;
      const name = connected.name;
      connected = null;
      input = null;
      session.hidden = true;
      session.innerHTML = "";
      list.hidden = false;
      card.hidden = false;
      setKeys("list");
      showToast(`✓ Back from ${name} · exit 0`);
      body.focus({ preventScroll: true });
    };

    const run = (command) => {
      const trimmed = command.trim();
      print(`<span class="ps">${promptText()}</span> ${escape(command)}`);
      if (trimmed) {
        history.push(trimmed);
        historyAt = history.length;
      }
      if (trimmed === "exit" || trimmed === "logout") {
        print("logout");
        setTimeout(disconnect, 250);
        return;
      }
      if (trimmed === "clear") {
        while (session.childElementCount > 1) session.firstElementChild.remove();
        return;
      }
      const text = output(trimmed);
      if (text) print(text);
    };

    const connect = () => {
      const host = hosts[selected];
      connected = host;
      history = [];
      historyAt = 0;
      list.hidden = true;
      card.hidden = true;
      session.hidden = false;
      session.innerHTML = "";
      const prompt = document.createElement("label");
      prompt.className = "live-prompt";
      prompt.innerHTML = `<span class="ps">${promptText()}</span><input type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Command on ${host.name}">`;
      session.append(prompt);
      input = prompt.querySelector("input");
      print(`<span class="banner"><span class="dot">●</span> Connected to <b>${host.name}</b>  ${host.user}@${host.address} · exit or Ctrl+D brings you back</span>`);
      print(" ");
      print(`Welcome to ${host.os} (GNU/Linux ${host.kernel} x86_64)\n\nLast login: ${new Date(Date.now() - 86400000).toString().slice(0, 24)} from 10.0.4.2`);
      setKeys("session");
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          const value = input.value;
          input.value = "";
          run(value);
        } else if (event.key === "d" && event.ctrlKey) {
          event.preventDefault();
          if (!input.value) {
            print(`<span class="ps">${promptText()}</span> logout`);
            setTimeout(disconnect, 200);
          }
        } else if (event.key === "c" && event.ctrlKey) {
          event.preventDefault();
          print(`<span class="ps">${promptText()}</span> ${escape(input.value)}^C`);
          input.value = "";
        } else if (event.key === "l" && event.ctrlKey) {
          event.preventDefault();
          run("clear");
        } else if (event.key === "ArrowUp" && history.length) {
          event.preventDefault();
          historyAt = Math.max(0, historyAt - 1);
          input.value = history[historyAt];
        } else if (event.key === "ArrowDown" && history.length) {
          event.preventDefault();
          historyAt = Math.min(history.length, historyAt + 1);
          input.value = history[historyAt] || "";
        }
      });
      input.focus({ preventScroll: true });
    };

    body.addEventListener("keydown", (event) => {
      if (connected) return;
      const moves = { ArrowDown: 1, j: 1, ArrowUp: -1, k: -1 };
      if (event.key in moves) {
        event.preventDefault();
        select(selected + moves[event.key]);
      } else if (event.key === "Home") {
        event.preventDefault();
        select(0);
      } else if (event.key === "End") {
        event.preventDefault();
        select(hosts.length - 1);
      } else if (event.key === "Enter" || event.key === "ArrowRight") {
        event.preventDefault();
        connect();
      }
    });

    rows.forEach((row) => {
      row.addEventListener("click", () => {
        const index = Number(row.dataset.host);
        if (index === selected) connect();
        else select(index);
        if (!connected) body.focus({ preventScroll: true });
      });
    });

    session.addEventListener("click", () => {
      if (input && !window.getSelection().toString()) input.focus({ preventScroll: true });
    });

    keys.addEventListener("click", (event) => {
      const button = event.target.closest("[data-live-action]");
      if (!button) return;
      const action = button.dataset.liveAction;
      if (action === "connect") connect();
      if (action === "up") select(selected - 1);
      if (action === "down") select(selected + 1);
      if (action === "exit") disconnect();
      if (action === "help" && connected) {
        run("help");
        input.focus({ preventScroll: true });
      }
    });

    select(0);
    setKeys("list");

    if (!calm) {
      const items = [...list.children, ...card.children];
      items.forEach((item, index) => item.style.setProperty("--row", String(index)));
      live.classList.add("booting");
      requestAnimationFrame(() => requestAnimationFrame(() => {
        live.classList.remove("booting");
        live.classList.add("booted");
      }));
    }
  }

  const suffixes = {
    setup: "-setup.exe",
    zip: "-windows-x64.zip",
    apk: "-android.apk",
    "deb-amd64": "_amd64.deb",
    "deb-arm64": "_arm64.deb",
  };

  const megabytes = (bytes) => `${Math.max(1, Math.round(bytes / 1048576))} MB`;

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

  fetch("https://api.github.com/repos/steelshell/releases/releases?per_page=30", {
    headers: { Accept: "application/vnd.github+json" },
    cache: "no-store",
  })
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
