(function () {
  var root = document.documentElement;
  var saved = null;
  try { saved = localStorage.getItem("steelshell-lang"); } catch (error) { saved = null; }
  var languages = navigator.languages || [navigator.language || ""];
  var russian = saved ? saved === "ru" : languages.some(function (tag) { return /^(ru|uk|be|kk)/i.test(tag); });
  root.classList.toggle("ru", russian);
  root.lang = russian ? "ru" : "en";
  var agent = navigator.userAgent || "";
  var os = /Android/i.test(agent) ? "android" : /Windows/i.test(agent) ? "windows" : /iPhone|iPad|Mac/i.test(agent) ? "apple" : /Linux|X11/i.test(agent) ? "linux" : "other";
  root.classList.add("os-" + os);
})();
