#!/usr/bin/env bash
set -u
TOOLS=(subfinder dnsx shuffledns alterx naabu httpx katana gau assetfinder waybackurls anew unfurl qsreplace hakrawler gospider ffuf gobuster feroxbuster rustscan nuclei dalfox kxss sqlmap arjun dirsearch wafw00f gowitness trufflehog gitleaks semgrep nmap masscan nikto whatweb)
missing=0
for tool in "${TOOLS[@]}"; do
  if command -v "$tool" >/dev/null 2>&1; then printf 'OK       %s\n' "$tool"; else printf 'MISSING  %s\n' "$tool"; missing=$((missing+1)); fi
done
printf '\nMissing: %d/%d\n' "$missing" "${#TOOLS[@]}"
exit "$missing"

