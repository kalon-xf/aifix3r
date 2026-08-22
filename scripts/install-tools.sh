#!/usr/bin/env bash
set -Eeuo pipefail

if (( $# == 0 )); then
  GROUPS=(core)
else
  GROUPS=("$@")
fi
BIN_DIR="${AIFIX3R_BIN_DIR:-$HOME/.local/bin}"
mkdir -p "$BIN_DIR"
export PATH="$BIN_DIR:$HOME/go/bin:$PATH"

FAILED=()

log() { printf '[aifix3r] %s\n' "$*"; }
has_group() { local wanted="$1"; for g in "${GROUPS[@]}"; do [[ "$g" == "$wanted" || "$g" == all ]] && return 0; done; return 1; }

install_apt() {
  command -v apt-get >/dev/null || return 0
  sudo apt-get update
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y "$@"
}
install_go() {
  command -v go >/dev/null || { log 'Go missing; install core first'; FAILED+=(go); return 0; }
  for p in "$@"; do
    log "go install $p"
    if ! GOBIN="$BIN_DIR" go install "$p"; then FAILED+=("$p"); log "warning: $p failed; continuing"; fi
  done
}
install_pipx() {
  command -v pipx >/dev/null || { log 'pipx missing; install core first'; FAILED+=(pipx); return 0; }
  for p in "$@"; do
    log "pipx install $p"
    if ! pipx install --force "$p"; then FAILED+=("$p"); log "warning: $p failed; continuing"; fi
  done
}
install_cargo() {
  command -v cargo >/dev/null || { log 'cargo missing; skipping Rust tools'; FAILED+=(cargo); return 0; }
  for p in "$@"; do
    if ! cargo install --locked "$p"; then FAILED+=("$p"); log "warning: $p failed; continuing"; fi
  done
}

if has_group core; then install_apt git curl wget jq tmux parallel build-essential python3 python3-pip pipx golang-go nmap cargo; fi
if has_group recon; then
  install_go github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest github.com/projectdiscovery/dnsx/cmd/dnsx@latest github.com/projectdiscovery/shuffledns/cmd/shuffledns@latest github.com/projectdiscovery/alterx/cmd/alterx@latest github.com/projectdiscovery/naabu/v2/cmd/naabu@latest github.com/projectdiscovery/httpx/cmd/httpx@latest github.com/projectdiscovery/katana/cmd/katana@latest github.com/lc/gau/v2/cmd/gau@latest github.com/tomnomnom/assetfinder@latest github.com/tomnomnom/waybackurls@latest github.com/tomnomnom/anew@latest github.com/tomnomnom/unfurl@latest github.com/tomnomnom/qsreplace@latest github.com/hakluke/hakrawler@latest github.com/jaeles-project/gospider@latest github.com/ffuf/ffuf/v2@latest github.com/OJ/gobuster/v3@latest github.com/sensepost/gowitness@latest
  install_pipx uro arjun dirsearch wafw00f dnsgen
  install_cargo feroxbuster rustscan
fi
if has_group web; then install_go github.com/hahwul/dalfox/v2@latest github.com/Emoe/kxss@latest github.com/jaeles-project/jaeles@latest github.com/assetnote/kiterunner/cmd/kiterunner@latest; install_pipx sqlmap xsstrike paramspider jwt-tool; fi
if has_group vuln; then install_apt nikto masscan whatweb; install_go github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest github.com/hahwul/dalfox/v2@latest; nuclei -update-templates || true; fi
if has_group secrets; then install_go github.com/trufflesecurity/trufflehog/v3@latest github.com/gitleaks/gitleaks/v8@latest; install_pipx semgrep; fi
if has_group cloud; then install_pipx prowler scoutsuite cloud-enum; fi
if has_group mobile; then install_pipx frida-tools objection; fi

log "complete; add $BIN_DIR and $HOME/go/bin to PATH"
if (( ${#FAILED[@]} )); then
  log "failed packages (${#FAILED[@]}): ${FAILED[*]}"
  exit 2
fi
