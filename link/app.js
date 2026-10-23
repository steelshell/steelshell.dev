"use strict";

(() => {
  const strings = {
    en: {
      title: "Sign in to Steelshell",
      request: (device) => [["strong", device], " wants to sign in to your Steelshell account."],
      requested: (ip, ago) => `Requested from ${ip} · ${ago}`,
      codeHint: "Check that your terminal shows the same code",
      email: "Email",
      password: "Password",
      next: "Continue",
      checking: "Checking your password…",
      notMe: "I didn't ask for this, deny it",
      confirmTitle: "Allow this device?",
      confirmBody: (device, email) => [["strong", device], " will get the servers, keys, passwords and snippets of ", ["strong", email], "."],
      allow: "Allow",
      deny: "Deny",
      sealing: "Handing over the keys…",
      note: "Your vault key is encrypted in this browser for this device only. The Steelshell server never sees it.",
      doneTitle: "Done",
      doneBody: (device) => ["Go back to your terminal, ", ["strong", device], " is signed in. You can close this tab."],
      deniedTitle: "Sign-in denied",
      deniedBody: "The device did not get access to your account.",
      goneTitle: "This link no longer works",
      goneBody: "It has expired or was already used. Run steelshell login again to get a new one.",
      wrong: "Wrong email or password.",
      tooMany: "Too many attempts. Try again in 15 minutes.",
      offline: "Could not reach Steelshell. Check your connection and try again.",
      oldBrowser: "This browser lacks the encryption Steelshell needs. Open the link in a current Chrome, Firefox or Safari.",
      expires: (left) => `This link works for ${left} more`,
      justNow: "just now",
      minutesAgo: (minutes) => `${minutes} min ago`,
      footer: "Only approve sign-ins you started yourself.",
      tamperedTitle: "Don't sign in with this link",
      tamperedBody: "The request that reached this page does not match the device that made the link. Someone may have changed it on the way. Run steelshell login again, or sign in there with your email and password.",
      unsafe: "The server asked for weaker password protection than Steelshell allows, so your password was not used.",
      framedTitle: "Open this page on its own",
      framedBody: "For your safety, sign-in approval does not work inside another page. Open steelshell.dev/link directly.",
    },
    ru: {
      title: "Вход в Steelshell",
      request: (device) => [["strong", device], " просит доступ к вашему аккаунту Steelshell."],
      requested: (ip, ago) => `Запрос с ${ip} · ${ago}`,
      codeHint: "Проверьте, что в терминале показан такой же код",
      email: "Почта",
      password: "Пароль",
      next: "Продолжить",
      checking: "Проверяем пароль…",
      notMe: "Я этого не запрашивал, отклонить",
      confirmTitle: "Разрешить вход?",
      confirmBody: (device, email) => [["strong", device], " получит серверы, ключи, пароли и сниппеты аккаунта ", ["strong", email], "."],
      allow: "Разрешить",
      deny: "Отклонить",
      sealing: "Передаём ключи…",
      note: "Ключ хранилища шифруется прямо в браузере и только для этого устройства. Сервер Steelshell его не видит.",
      doneTitle: "Готово",
      doneBody: (device) => ["Возвращайтесь в терминал: ", ["strong", device], " уже вошёл. Вкладку можно закрыть."],
      deniedTitle: "Вход отклонён",
      deniedBody: "Устройство не получило доступа к аккаунту.",
      goneTitle: "Ссылка больше не действует",
      goneBody: "Она устарела или уже использована. Запустите steelshell login ещё раз, чтобы получить новую.",
      wrong: "Неверная почта или пароль.",
      tooMany: "Слишком много попыток. Подождите 15 минут.",
      offline: "Нет связи со Steelshell. Проверьте интернет и попробуйте ещё раз.",
      oldBrowser: "Этот браузер не умеет нужное шифрование. Откройте ссылку в свежем Chrome, Firefox или Safari.",
      expires: (left) => `Ссылка действует ещё ${left}`,
      justNow: "только что",
      minutesAgo: (minutes) => `${minutes} мин назад`,
      footer: "Разрешайте только входы, которые начали сами.",
      tamperedTitle: "Не входите по этой ссылке",
      tamperedBody: "Запрос, который дошёл до страницы, не совпадает с устройством, создавшим ссылку. Возможно, его подменили по дороге. Запустите steelshell login ещё раз или войдите там по почте и паролю.",
      unsafe: "Сервер запросил более слабую защиту пароля, чем допускает Steelshell, поэтому пароль не использован.",
      framedTitle: "Откройте страницу отдельно",
      framedBody: "Ради безопасности подтверждение входа не работает внутри другой страницы. Откройте steelshell.dev/link напрямую.",
    },
  };

  const russian = (navigator.languages || [navigator.language || ""]).some((tag) => tag.toLowerCase().startsWith("ru"));
  const t = russian ? strings.ru : strings.en;
  document.documentElement.lang = russian ? "ru" : "en";
  document.title = t.title;

  const api = document.querySelector('meta[name="steelshell-api"]').content;
  const asked = new URLSearchParams(location.search).get("code");
  const userCode = (asked || decodeURIComponent(location.pathname.split("/").filter(Boolean).pop() || "")).toUpperCase();
  const view = document.getElementById("view");
  document.getElementById("footer").textContent = t.footer;

  const platforms = { linux: "Linux", windows: "Windows", macos: "macOS", android: "Android", ios: "iOS", web: "Web" };
  let link = null;
  let countdown = null;

  function node(tag, attributes, ...children) {
    const element = document.createElement(tag);
    for (const [name, value] of Object.entries(attributes || {})) {
      if (name === "on") for (const [event, handler] of Object.entries(value)) element.addEventListener(event, handler);
      else if (value !== false && value != null) element.setAttribute(name, value === true ? "" : value);
    }
    for (const child of children.flat()) {
      if (child == null || child === false) continue;
      element.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return element;
  }

  function rich(parts) {
    return [].concat(parts).map((part) => (Array.isArray(part) ? node(part[0], null, part[1]) : part));
  }

  function show(...children) {
    view.replaceChildren(...children.flat().filter(Boolean));
    view.style.animation = "none";
    void view.offsetWidth;
    view.style.animation = "";
  }

  function ago(iso) {
    const minutes = Math.floor((Date.now() - Date.parse(iso)) / 60000);
    return minutes < 1 ? t.justNow : t.minutesAgo(minutes);
  }

  function deviceCard() {
    const meta = [platforms[link.device.platform] || link.device.platform, link.device.app_version].filter(Boolean).join(" · ");
    return node("div", { class: "device" },
      node("div", { class: "glyph", "aria-hidden": "true" }, ">_"),
      node("div", null,
        node("div", { class: "name" }, link.device.name),
        node("div", { class: "meta" }, meta),
        node("div", { class: "meta" }, t.requested(link.ip, ago(link.created_at))),
      ),
    );
  }

  function timerLine() {
    const line = node("div", { class: "timer" });
    const tick = () => {
      const left = Math.max(0, Math.floor((Date.parse(link.expires_at) - Date.now()) / 1000));
      if (left === 0) {
        stopTimer();
        gone();
        return;
      }
      line.textContent = t.expires(`${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`);
    };
    stopTimer();
    tick();
    countdown = setInterval(tick, 1000);
    return line;
  }

  function stopTimer() {
    if (countdown) clearInterval(countdown);
    countdown = null;
  }

  async function call(method, path, body) {
    let response;
    try {
      response = await fetch(api + path, {
        method,
        headers: body ? { "Content-Type": "application/json" } : {},
        body: body ? JSON.stringify(body) : undefined,
        credentials: "omit",
        cache: "no-store",
        referrerPolicy: "no-referrer",
      });
    } catch {
      throw { kind: "offline" };
    }
    if (response.status === 204) return null;
    if (!response.ok) throw { kind: "http", status: response.status };
    return response.json();
  }

  function errorText(error) {
    if (error && error.kind === "http") {
      if (error.status === 401) return t.wrong;
      if (error.status === 429) return t.tooMany;
    }
    if (error && error.kind === "crypto") return t.oldBrowser;
    if (error && error.kind === "unsafe") return t.unsafe;
    return t.offline;
  }

  function busy(button, label) {
    button.disabled = true;
    button.replaceChildren(node("span", { class: "spinner", "aria-hidden": "true" }), label);
  }

  function icon(ok) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "26");
    svg.setAttribute("height", "26");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", ok ? "M5 12.5l4.5 4.5L19 7.5" : "M7 7l10 10M17 7L7 17");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "2.4");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    svg.append(path);
    return svg;
  }

  function result(ok, title, body) {
    stopTimer();
    show(
      node("div", { class: `status ${ok ? "ok" : "no"}`, "aria-hidden": "true" }, icon(ok)),
      node("h1", null, title),
      node("p", null, rich(body)),
    );
  }

  function gone() {
    result(false, t.goneTitle, t.goneBody);
  }

  async function deny() {
    try {
      await call("POST", `/v1/link/${encodeURIComponent(userCode)}/deny`);
      result(false, t.deniedTitle, t.deniedBody);
    } catch (error) {
      if (error.kind === "http" && error.status === 404) gone();
    }
  }

  function signIn(message, rememberedEmail) {
    const email = node("input", { id: "email", type: "email", autocomplete: "username", required: true, inputmode: "email", value: rememberedEmail || null });
    const password = node("input", { id: "password", type: "password", autocomplete: "current-password", required: true });
    const submit = node("button", { class: "primary", type: "submit" }, t.next);
    const form = node("form", { on: { submit: (event) => { event.preventDefault(); unlock(email.value, password.value, submit); } } },
      message ? node("div", { class: "error", role: "alert" }, message) : null,
      node("label", { for: "email" }, t.email), email,
      node("label", { for: "password" }, t.password), password,
      submit,
    );
    show(
      node("h1", null, t.title),
      node("p", null, rich(t.request(link.device.name))),
      deviceCard(),
      node("div", { class: "code" }, node("b", null, link.user_code), node("small", null, t.codeHint)),
      form,
      node("button", { class: "danger-link", type: "button", on: { click: deny } }, t.notMe),
      timerLine(),
    );
    (rememberedEmail ? password : email).focus();
  }

  async function unlock(emailValue, password, button) {
    const email = emailValue.trim().toLowerCase();
    busy(button, t.checking);
    let keys = null;
    try {
      const prelogin = await call("POST", "/v1/auth/prelogin", { email });
      if (!SteelshellCrypto.strongKdf(prelogin.kdf)) throw { kind: "unsafe" };
      try {
        keys = await SteelshellCrypto.accountKeys(password, prelogin.kdf);
      } catch {
        throw { kind: "crypto" };
      }
      const unlocked = await call("POST", `/v1/link/${encodeURIComponent(userCode)}/unlock`, { email, auth_key: keys.authKey });
      let vaultKey;
      try {
        vaultKey = await SteelshellCrypto.unwrapVaultKey(unlocked.protected_vault_key, keys.wrapKey);
      } catch {
        throw { kind: "http", status: 401 };
      }
      confirm(unlocked, vaultKey);
    } catch (error) {
      if (error && error.kind === "http" && error.status === 404) return gone();
      signIn(errorText(error), email);
    } finally {
      if (keys) keys.wrapKey.fill(0);
    }
  }

  function confirm(unlocked, vaultKey) {
    const allow = node("button", { class: "primary", type: "button" }, t.allow);
    const refuse = node("button", { class: "secondary", type: "button" }, t.deny);
    allow.addEventListener("click", async () => {
      busy(allow, t.sealing);
      refuse.disabled = true;
      try {
        let sealed;
        try {
          sealed = await SteelshellCrypto.sealForDevice(vaultKey, link.public_key, link.user_code);
        } catch {
          throw { kind: "crypto" };
        }
        await call("POST", `/v1/link/${encodeURIComponent(userCode)}/approve`, {
          ticket: unlocked.ticket,
          sealed_vault_key: sealed.sealed,
          ephemeral_public_key: sealed.ephemeral,
        });
        vaultKey.fill(0);
        result(true, t.doneTitle, t.doneBody(link.device.name));
      } catch (error) {
        vaultKey.fill(0);
        if (error && error.kind === "http" && (error.status === 404 || error.status === 403)) return gone();
        signIn(errorText(error), unlocked.user.email);
      }
    });
    refuse.addEventListener("click", () => {
      vaultKey.fill(0);
      deny();
    });
    show(
      node("h1", null, t.confirmTitle),
      node("p", null, rich(t.confirmBody(link.device.name, unlocked.user.email))),
      deviceCard(),
      node("div", { class: "code" }, node("b", null, link.user_code), node("small", null, t.codeHint)),
      allow,
      refuse,
      node("div", { class: "note" }, t.note),
      timerLine(),
    );
    allow.focus();
  }

  async function start() {
    if (window.top !== window.self) return result(false, t.framedTitle, t.framedBody);
    if (!/^[A-Z0-9]{4}-?[A-Z0-9]{4}$/.test(userCode)) return gone();
    if (!globalThis.crypto || !globalThis.crypto.subtle || !globalThis.hashwasm || !globalThis.nacl) {
      return result(false, t.goneTitle, t.oldBrowser);
    }
    try {
      link = await call("GET", `/v1/link/${encodeURIComponent(userCode)}`);
    } catch (error) {
      if (error && error.kind === "http" && error.status === 404) return gone();
      return result(false, t.goneTitle, t.offline);
    }
    if (link.status === "pending") {
      const tag = location.hash.replace(/^#/, "");
      let code;
      let keyTag;
      try {
        code = await SteelshellCrypto.linkCode(link.public_key);
        keyTag = await SteelshellCrypto.keyTag(link.public_key);
      } catch {
        return result(false, t.tamperedTitle, t.tamperedBody);
      }
      const asked = userCode.replace("-", "");
      if (code !== link.user_code || code.replace("-", "") !== asked || (tag && tag !== keyTag)) {
        return result(false, t.tamperedTitle, t.tamperedBody);
      }
      return signIn();
    }
    if (link.status === "denied") return result(false, t.deniedTitle, t.deniedBody);
    if (link.status === "approved") return result(true, t.doneTitle, t.doneBody(link.device.name));
    return gone();
  }

  start();
})();
