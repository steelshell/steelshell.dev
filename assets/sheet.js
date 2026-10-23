"use strict";

(() => {
  const root = document.documentElement;

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
      const labels = [...button.querySelectorAll("span")];
      const previous = labels.map((label) => label.textContent);
      labels.forEach((label) => { label.textContent = label.classList.contains("ru") ? "Скопировано" : "Copied"; });
      button.classList.add("done");
      setTimeout(() => {
        labels.forEach((label, index) => { label.textContent = previous[index]; });
        button.classList.remove("done");
      }, 1600);
    });
  }

  const suffixes = {
    setup: "-setup.exe",
    zip: "-windows-x64.zip",
    apk: "-android.apk",
    "deb-amd64": "_amd64.deb",
    "deb-arm64": "_arm64.deb",
  };

  const megabytes = (bytes) => String(Math.max(1, Math.round(bytes / 1048576)));
  const shortDate = (iso) => {
    const date = new Date(iso);
    const pad = (value) => String(value).padStart(2, "0");
    return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}`;
  };

  const apply = (release, version, attribute) => {
    if (!release) return;
    document.querySelectorAll(`[${attribute}]`).forEach((element) => { element.textContent = version; });
    for (const asset of release.assets || []) {
      for (const [key, suffix] of Object.entries(suffixes)) {
        if (!asset.name.endsWith(suffix)) continue;
        document.querySelectorAll(`[data-download="${key}"]`).forEach((link) => { link.href = asset.browser_download_url; });
        document.querySelectorAll(`[data-size="${key}"]`).forEach((size) => { size.textContent = megabytes(asset.size); });
        document.querySelectorAll(`[data-file="${key}"]`).forEach((file) => { file.textContent = asset.name; });
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
      if (app && app.published_at) {
        document.querySelectorAll("[data-app-date]").forEach((cell) => { cell.textContent = shortDate(app.published_at); });
      }
    })
    .catch(() => {});
})();
