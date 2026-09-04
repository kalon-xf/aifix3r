#!/usr/bin/env bash
set -Eeuo pipefail

BIN_DIR="${AIFIX3R_BIN_DIR:-$HOME/.local/bin}"
mkdir -p "$BIN_DIR"
export PATH="$BIN_DIR:$HOME/go/bin:$PATH"
failed=()

log() { printf '[aifix3r-repair] %s\n' "$*"; }
try() { local name="$1"; shift; log "installing $name"; if ! "$@"; then failed+=("$name"); log "FAILED: $name"; fi; }

run_root() {
  if (( EUID == 0 )); then
    "$@"
  elif command -v sudo >/dev/null 2>&1; then
    sudo "$@"
  else
    log "administrator privileges are required: $*"
    return 1
  fi
}

run_root apt-get update
run_root env DEBIAN_FRONTEND=noninteractive apt-get install -y git curl build-essential golang-go pipx cargo libssl-dev pkg-config

go_tool() { GOBIN="$BIN_DIR" go install "$1"; }
pipx_tool() { pipx install --force "$1"; }
cargo_tool() { cargo install --locked "$1"; }

try dnsx go_tool github.com/projectdiscovery/dnsx/cmd/dnsx@latest
try shuffledns go_tool github.com/projectdiscovery/shuffledns/cmd/shuffledns@latest
try alterx go_tool github.com/projectdiscovery/alterx/cmd/alterx@latest
try assetfinder go_tool github.com/tomnomnom/assetfinder@latest
try anew go_tool github.com/tomnomnom/anew@latest
try unfurl go_tool github.com/tomnomnom/unfurl@latest
try hakrawler go_tool github.com/hakluke/hakrawler@latest
try gospider go_tool github.com/jaeles-project/gospider@latest
try gowitness go_tool github.com/sensepost/gowitness@latest
try trufflehog go_tool github.com/trufflesecurity/trufflehog/v3@latest
try arjun pipx_tool arjun
try dirsearch pipx_tool dirsearch
try feroxbuster cargo_tool feroxbuster
try rustscan cargo_tool rustscan

hash -r
log 'verification'
"$(dirname "$0")/verify-tools.sh" || true

if (( ${#failed[@]} )); then
  log "still failed (${#failed[@]}): ${failed[*]}"
  log 'Send the FAILED lines and: go version; cargo --version; python3 --version'
  exit 2
fi
log 'all 14 missing tools repaired'
