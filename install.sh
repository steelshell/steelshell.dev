#!/bin/sh
set -eu

repo="steelshell/releases"
tmp=""
pid=""

if [ -t 1 ]; then live=true; else live=false; fi
if $live && [ -z "${NO_COLOR:-}" ]; then
  e=$(printf '\033')
  r="$e[0m"; bold="$e[1m"; dim="$e[2m"; green="$e[38;5;78m"; red="$e[38;5;203m"; muted="$e[38;5;246m"
  f1="$e[38;5;23m"; f2="$e[38;5;36m"; f3="$e[38;5;78m"; b1="$e[48;5;23m"; b2="$e[48;5;36m"; b3="$e[48;5;78m"
  track="$e[38;5;238m"
else
  r=""; bold=""; dim=""; green=""; red=""; muted=""; f1=""; f2=""; f3=""; b1=""; b2=""; b3=""; track=""
fi

cleanup() {
  [ -n "$pid" ] && kill "$pid" 2>/dev/null || true
  [ -n "$tmp" ] && rm -rf "$tmp"
  if $live; then printf '\033[?25h'; fi
}
trap cleanup EXIT
trap 'if $live; then printf "\r\033[K"; fi; printf "  %s×%s Stopped.\n" "$red" "$r"; exit 130' INT TERM

clear_line() {
  if $live; then printf '\r\033[K'; fi
}

ok() {
  clear_line
  printf '  %s✓%s %s\n' "$green" "$r" "$1"
}

fail() {
  clear_line
  printf '  %s×%s %s\n' "$red" "$r" "$1" >&2
  if [ -n "${2:-}" ] && [ -s "$2" ]; then
    tail -n 5 "$2" | sed 's/^/    /' >&2
  fi
  exit 1
}

frame() {
  case $1 in
    0) printf '⠋' ;; 1) printf '⠙' ;; 2) printf '⠹' ;; 3) printf '⠸' ;; 4) printf '⠼' ;;
    5) printf '⠴' ;; 6) printf '⠦' ;; 7) printf '⠧' ;; 8) printf '⠇' ;; *) printf '⠏' ;;
  esac
}

spin() {
  label=$1
  shift
  if ! $live; then
    "$@" </dev/null >"$tmp/log" 2>&1
    return
  fi
  "$@" </dev/null >"$tmp/log" 2>&1 &
  pid=$!
  i=0
  while kill -0 "$pid" 2>/dev/null; do
    printf '\r  %s%s%s %s' "$green" "$(frame $i)" "$r" "$label"
    i=$(( (i + 1) % 10 ))
    sleep 0.1
  done
  status=0
  wait "$pid" || status=$?
  pid=""
  return "$status"
}

megabytes() {
  printf '%d.%d' $(( $1 / 1048576 )) $(( $1 % 1048576 * 10 / 1048576 ))
}

bar() {
  have=$1
  total=$2
  width=28
  filled=0
  [ "$total" -gt 0 ] && filled=$(( have * width / total ))
  [ "$filled" -gt "$width" ] && filled=$width
  line=""
  n=0
  while [ "$n" -lt "$filled" ]; do line="$line█"; n=$(( n + 1 )); done
  rest=""
  while [ "$n" -lt "$width" ]; do rest="$rest░"; n=$(( n + 1 )); done
  printf '%s%s%s%s%s' "$green" "$line" "$track" "$rest" "$r"
}

if command -v curl >/dev/null 2>&1; then
  fetch() { curl -fsSL "$1"; }
  save() { curl -fsSL -o "$2" "$1"; }
  remote_size() { curl -fsSLI "$1" 2>/dev/null | tr -d '\r' | awk 'tolower($1) == "content-length:" { n = $2 } END { print n + 0 }'; }
elif command -v wget >/dev/null 2>&1; then
  fetch() { wget -qO- "$1"; }
  save() { wget -qO "$2" "$1"; }
  remote_size() { wget --spider -S "$1" 2>&1 | tr -d '\r' | awk 'tolower($1) == "content-length:" { n = $2 } END { print n + 0 }'; }
else
  printf 'steelshell: install curl or wget first.\n' >&2
  exit 1
fi

download() {
  url=$1
  out=$2
  if ! $live; then
    save "$url" "$out" </dev/null || return 1
    ok "Downloaded $(megabytes "$(wc -c < "$out" | tr -d ' ')") MB"
    return
  fi
  total=$(remote_size "$url" || echo 0)
  : > "$out"
  save "$url" "$out" </dev/null &
  pid=$!
  started=$(date +%s)
  i=0
  printf '\033[?25l'
  while kill -0 "$pid" 2>/dev/null; do
    have=$(wc -c < "$out" | tr -d ' ')
    if [ "$total" -gt 0 ]; then
      percent=$(( have * 100 / total ))
      printf '\r  %s%s%s Downloading  %s %3d%%  %s%s / %s MB%s\033[K' "$green" "$(frame $i)" "$r" "$(bar "$have" "$total")" "$percent" "$muted" "$(megabytes "$have")" "$(megabytes "$total")" "$r"
    else
      printf '\r  %s%s%s Downloading  %s%s MB%s\033[K' "$green" "$(frame $i)" "$r" "$muted" "$(megabytes "$have")" "$r"
    fi
    i=$(( (i + 1) % 10 ))
    sleep 0.1
  done
  status=0
  wait "$pid" || status=$?
  pid=""
  printf '\033[?25h'
  elapsed=$(( $(date +%s) - started ))
  [ "$status" -eq 0 ] || return "$status"
  have=$(wc -c < "$out" | tr -d ' ')
  printf '\r  %s%s%s Downloading  %s 100%%  %s%s MB%s\033[K' "$green" "$(frame 0)" "$r" "$(bar 1 1)" "$muted" "$(megabytes "$have")" "$r"
  sleep 0.2
  took="$elapsed s"
  [ "$elapsed" -lt 1 ] && took="under a second"
  ok "Downloaded $(megabytes "$have") MB in $took"
}

header() {
  logo0="    ${f2}▄${f1}${b3}▀${r}${f3}██${f1}${b3}▀${r}${f2}▄    ${r}"
  logo1=" ${f3}▄${f2}${b3}▀${r}${f3}▀▀${f3}${b2}▀${r}${f3}█████${f2}${b3}▀${r}${f3}▄ ${r}"
  logo2="${f2}█${f3}██   ${f1}▀${f3}▀${f3}${b1}▀${r}${f3}██${f3}${b2}▀${r}${f3}▀ ${r}"
  logo3="${f1}▀${f3}${b1}▀${r}${f3}█ ${f1}▀${f3}${b1}▀${r}${f1}${b3}▀${r}   ${f1}▄   ${r}"
  logo4="${f1}${b2}▀${r}${f1}${b3}▀${r}${f2}▄ ${f1}▀${f3}▀${f1}▀${f1}${b2}▀${r}${f1}${b2}▀${r}${f1}▄█${f3}█${f1}${b3}▀${r}${f2}▄${r}"
  logo5="${f2}█${f3}███${f2}${b3}▀${r}${f3}▄${f1}▄   █${f3}██${f2}█${r}"
  logo6=" ${f3}▀${f3}${b1}▀${r}${f3}█████${f1}${b3}▀${r}${f3}▄${f1}${b2}▀${r}${f3}${b2}▀${r}${f3}▀ ${r}"
  logo7="    ${f2}▀${f3}${b1}▀${r}${f3}██${f3}${b1}▀${r}${f2}▀    ${r}"
  printf '\n'
  printf '  %s\n' "$logo0"
  printf '  %s     %sSteelshell%s\n' "$logo1" "$bold" "$r"
  printf '  %s     %sYour servers, keys and snippets%s\n' "$logo2" "$muted" "$r"
  printf '  %s     %sright in the terminal.%s\n' "$logo3" "$muted" "$r"
  printf '  %s\n' "$logo4"
  printf '  %s     %ssteelshell.dev%s\n' "$logo5" "$green" "$r"
  printf '  %s\n' "$logo6"
  printf '  %s\n' "$logo7"
  printf '\n'
}

if $live; then header; else printf 'Installing Steelshell CLI\n'; fi

[ "$(uname -s)" = "Linux" ] || fail "Steelshell CLI runs on Linux."
command -v dpkg >/dev/null 2>&1 || fail "This installer is for Debian and Ubuntu: dpkg was not found."

case "$(dpkg --print-architecture)" in
  amd64) arch=amd64 ;;
  arm64) arch=arm64 ;;
  *) fail "There is no build for $(dpkg --print-architecture) yet, only amd64 and arm64." ;;
esac

if [ "$(id -u)" -eq 0 ]; then
  sudo=""
elif command -v sudo >/dev/null 2>&1; then
  sudo="sudo"
else
  fail "Run this as root or install sudo."
fi

system=$( . /etc/os-release 2>/dev/null && printf '%s' "${PRETTY_NAME:-Linux}" || printf 'Linux')
ok "$system · $arch"

tmp="$(mktemp -d)"
chmod 755 "$tmp"

if [ -n "${STEELSHELL_VERSION:-}" ]; then
  tag="cli-v${STEELSHELL_VERSION#cli-v}"
else
  latest() {
    fetch "https://steelshell.dev/cli/latest.txt" > "$tmp/latest" 2>/dev/null || true
    if ! grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$' "$tmp/latest"; then
      fetch "https://api.github.com/repos/$repo/releases?per_page=50" |
        grep -o '"tag_name": *"cli-v[^"]*"' | head -n 1 | sed 's/.*"cli-v\([^"]*\)"$/\1/' > "$tmp/latest"
    fi
  }
  spin "Looking for the latest version" latest || true
  version="$(head -n 1 "$tmp/latest" 2>/dev/null | tr -d '[:space:]')"
  [ -n "$version" ] || fail "Could not find the latest version. Check the connection to steelshell.dev and github.com."
  tag="cli-v$version"
fi
version="${tag#cli-v}"

current=""
if command -v steelshell >/dev/null 2>&1; then
  current=$(steelshell --version 2>/dev/null </dev/null | awk '{ print $2 }') || current=""
fi
if [ -n "$current" ] && [ "$current" = "$version" ]; then
  ok "Steelshell CLI $version, already installed, reinstalling"
elif [ -n "$current" ]; then
  ok "Steelshell CLI $version, you have $current"
else
  ok "Steelshell CLI $version"
fi

package="steelshell_${version}_${arch}.deb"
base="https://github.com/$repo/releases/download/$tag"

download "$base/$package" "$tmp/$package" || fail "Could not download $base/$package"
save "$base/SHA256SUMS" "$tmp/SHA256SUMS" </dev/null || fail "Could not download the checksums."
(cd "$tmp" && grep " $package\$" SHA256SUMS | sha256sum -c --status) ||
  fail "The download does not match its checksum, so nothing was installed."
ok "Checksum matches"
chmod 644 "$tmp/$package"

if [ -n "$sudo" ]; then
  clear_line
  printf '  %sInstalling needs sudo.%s\n' "$muted" "$r"
  sudo -v </dev/tty || fail "sudo was refused, nothing was installed."
fi
spin "Installing" $sudo dpkg -i "$tmp/$package" || fail "dpkg could not install the package:" "$tmp/log"
if [ -n "$current" ] && [ "$current" != "$version" ]; then
  ok "Updated $current → $version in $(command -v steelshell)"
else
  ok "Installed $(command -v steelshell || printf /usr/bin/steelshell)"
fi

printf '\n  %sGet started%s\n' "$bold" "$r"
printf '    %ssteelshell%s               open Steelshell and sign in\n' "$green" "$r"
printf '    %ssteelshell login%s         sign in with a link from the command line\n' "$green" "$r"
printf '    %ssteelshell agent setup%s   let Claude Code work on your servers\n\n' "$green" "$r"
