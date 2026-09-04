#!/usr/bin/env bash
set -Eeuo pipefail

BIN_DIR="${AIFIX3R_BIN_DIR:-$HOME/.local/bin}"
mkdir -p "$BIN_DIR"
export PATH="$BIN_DIR:$HOME/go/bin:$PATH"

install_go() {
  local name="$1" package="$2"
  printf '[aifix3r] installing %s from %s\n' "$name" "$package"
  [[ "${AIFIX3R_DRY_RUN:-0}" == "1" ]] || GOBIN="$BIN_DIR" go install "$package"
}

if [[ "${AIFIX3R_DRY_RUN:-0}" != "1" ]]; then
  command -v go >/dev/null 2>&1 || { echo "Go is required. Run ./aifix3r tools core first." >&2; exit 69; }
fi
install_go subfinder github.com/projectdiscovery/subfinder/v2/cmd/subfinder@v2.8.0
install_go httpx github.com/projectdiscovery/httpx/cmd/httpx@v1.7.1
install_go naabu github.com/projectdiscovery/naabu/v2/cmd/naabu@v2.3.5
install_go katana github.com/projectdiscovery/katana/cmd/katana@v1.2.2
install_go nuclei github.com/projectdiscovery/nuclei/v3/cmd/nuclei@v3.4.10
install_go dalfox github.com/hahwul/dalfox/v2@v2.12.0

if command -v pipx >/dev/null 2>&1; then
  printf '[aifix3r] installing sqlmap 1.9.8\n'
  [[ "${AIFIX3R_DRY_RUN:-0}" == "1" ]] || pipx install --force "sqlmap==1.9.8"
else
  echo "pipx missing; sqlmap was not installed." >&2
fi

printf '[aifix3r] pinned runtime tools installed in %s\n' "$BIN_DIR"
