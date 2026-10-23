"use strict";

const SteelshellCrypto = (() => {
  const encoder = new TextEncoder();
  const subtle = globalThis.crypto.subtle;

  function toBase64(bytes) {
    let text = "";
    for (const byte of bytes) text += String.fromCharCode(byte);
    return btoa(text);
  }

  function fromBase64(text) {
    const raw = atob(text);
    const bytes = new Uint8Array(raw.length);
    for (let index = 0; index < raw.length; index++) bytes[index] = raw.charCodeAt(index);
    return bytes;
  }

  function concat(...parts) {
    const out = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
    let offset = 0;
    for (const part of parts) {
      out.set(part, offset);
      offset += part.length;
    }
    return out;
  }

  async function hkdf(master, info, salt = new Uint8Array(0)) {
    const key = await subtle.importKey("raw", master, "HKDF", false, ["deriveBits"]);
    const bits = await subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt, info: encoder.encode(info) },
      key,
      256,
    );
    return new Uint8Array(bits);
  }

  const codeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  async function labelled(label, publicKey) {
    const digest = await subtle.digest("SHA-256", concat(encoder.encode(label), fromBase64(publicKey)));
    return new Uint8Array(digest);
  }

  async function linkCode(publicKey) {
    const digest = await labelled("steelshell link code", publicKey);
    const bits = [...digest.slice(0, 5)].map((byte) => byte.toString(2).padStart(8, "0")).join("");
    let raw = "";
    for (let at = 0; at < 40; at += 5) raw += codeAlphabet[parseInt(bits.slice(at, at + 5), 2)];
    return `${raw.slice(0, 4)}-${raw.slice(4)}`;
  }

  async function keyTag(publicKey) {
    const digest = await labelled("steelshell link key", publicKey);
    return toBase64(digest.slice(0, 16)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function strongKdf(kdf) {
    let salt;
    try {
      salt = fromBase64(kdf.salt);
    } catch {
      return false;
    }
    const within = (value, low, high) => Number.isInteger(value) && value >= low && value <= high;
    return kdf.algorithm === "argon2id" &&
      salt.length >= 16 &&
      within(kdf.memory, 65536, 1048576) &&
      within(kdf.iterations, 2, 20) &&
      within(kdf.parallelism, 1, 16);
  }

  async function accountKeys(password, kdf) {
    if (!strongKdf(kdf)) throw new Error("unsafe key derivation");
    const master = await globalThis.hashwasm.argon2id({
      password: encoder.encode(password),
      salt: fromBase64(kdf.salt),
      parallelism: kdf.parallelism,
      iterations: kdf.iterations,
      memorySize: kdf.memory,
      hashLength: 32,
      outputType: "binary",
    });
    return {
      authKey: toBase64(await hkdf(master, "steelshell auth")),
      wrapKey: await hkdf(master, "steelshell wrap"),
    };
  }

  async function unwrapVaultKey(wrapped, wrapKey) {
    const raw = fromBase64(wrapped);
    const key = await subtle.importKey("raw", wrapKey, "AES-GCM", false, ["decrypt"]);
    const plain = await subtle.decrypt(
      { name: "AES-GCM", iv: raw.slice(0, 12), additionalData: encoder.encode("steelshell vault key") },
      key,
      raw.slice(12),
    );
    return new Uint8Array(plain);
  }

  async function sealForDevice(vaultKey, devicePublicKey, userCode) {
    const nacl = globalThis.nacl;
    const remote = fromBase64(devicePublicKey);
    if (remote.length !== 32) throw new Error("bad device key");
    const secret = globalThis.crypto.getRandomValues(new Uint8Array(32));
    const ephemeral = nacl.scalarMult.base(secret);
    const shared = nacl.scalarMult(secret, remote);
    if (shared.every((byte) => byte === 0)) throw new Error("bad device key");
    const material = await hkdf(shared, "steelshell device link", concat(ephemeral, remote));
    const key = await subtle.importKey("raw", material, "AES-GCM", false, ["encrypt"]);
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const sealed = await subtle.encrypt(
      { name: "AES-GCM", iv, additionalData: encoder.encode(`steelshell device link:${userCode}`) },
      key,
      vaultKey,
    );
    secret.fill(0);
    return { sealed: toBase64(concat(iv, new Uint8Array(sealed))), ephemeral: toBase64(ephemeral) };
  }

  return { toBase64, fromBase64, linkCode, keyTag, strongKdf, accountKeys, unwrapVaultKey, sealForDevice };
})();

if (typeof module !== "undefined") module.exports = SteelshellCrypto;
