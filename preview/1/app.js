"use strict";
(() => {
  const clock = document.querySelector("[data-clock]");
  const tick = () => { clock.textContent = new Date().toTimeString().slice(0, 5) + "  ● synced"; };
  tick();
  setInterval(tick, 15000);

  const sections = ["sync", "terminal", "agents", "linux", "download"].map((id) => document.getElementById(id));
  const tabs = [...document.querySelectorAll("[data-tab]")];
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const index = sections.indexOf(entry.target);
      tabs.forEach((tab, at) => tab.classList.toggle("is-active", at === index));
    }
  }, { rootMargin: "-45% 0px -50% 0px" });
  sections.forEach((section) => observer.observe(section));

  const pick = document.querySelector("[data-pick]");
  const options = [...pick.children];
  let selected = 0;
  const select = (index) => {
    selected = (index + options.length) % options.length;
    options.forEach((option, at) => {
      option.classList.toggle("is-selected", at === selected);
      option.setAttribute("aria-selected", String(at === selected));
    });
  };
  options.forEach((option, index) => option.addEventListener("mouseenter", () => select(index)));

  document.addEventListener("keydown", (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey || event.target.closest("input, textarea")) return;
    const number = Number(event.key);
    if (number >= 1 && number <= sections.length) {
      sections[number - 1].scrollIntoView();
      return;
    }
    const inDownload = document.getElementById("download").getBoundingClientRect().top < window.innerHeight * 0.6;
    if (inDownload && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      select(selected + (event.key === "ArrowDown" ? 1 : -1));
    } else if (event.key === "Enter" && !event.target.closest("a, button")) {
      options[inDownload ? selected : 0].querySelector("a").click();
    } else if (event.key === "g") {
      window.location.href = "https://github.com/steelshell/releases/releases";
    } else if (event.key === "l" || event.key === "L") {
      document.getElementById("linux").scrollIntoView();
    }
  });

  for (const button of document.querySelectorAll("[data-copy]")) {
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(document.getElementById(button.dataset.copy).textContent);
        button.textContent = "скопировано";
        button.classList.add("done");
        setTimeout(() => { button.textContent = "копировать"; button.classList.remove("done"); }, 1500);
      } catch (error) {
        button.textContent = "не вышло";
      }
    });
  }
})();
