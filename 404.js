"use strict";

(() => {
  const match = location.pathname.match(/^\/link\/([A-Za-z0-9]{4}-?[A-Za-z0-9]{4})\/?$/);
  if (match) location.replace(`/link/?code=${encodeURIComponent(match[1].toUpperCase())}${location.hash}`);
})();
