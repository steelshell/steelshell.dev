"use strict";
(() => {
  const stage = document.querySelector("[data-stage]");
  const windowImage = document.querySelector("[data-window]");
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches && stage) {
    const update = () => {
      const box = stage.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, (window.innerHeight - box.top) / (window.innerHeight * 0.9)));
      windowImage.style.setProperty("--tilt", `${22 * (1 - progress)}deg`);
      windowImage.style.setProperty("--scale", String(0.94 + 0.06 * progress));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
  }
  const copy = document.querySelector("[data-copy]");
  if (copy) {
    copy.addEventListener("click", async (event) => {
      event.preventDefault();
      const text = document.getElementById(copy.dataset.copy);
      try {
        await navigator.clipboard.writeText(text.textContent);
        const previous = text.textContent;
        text.textContent = "Скопировано, вставьте в терминал";
        setTimeout(() => { text.textContent = previous; }, 1600);
      } catch (error) {
        return;
      }
    });
  }
})();
