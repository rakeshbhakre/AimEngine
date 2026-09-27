#!/bin/bash
# THE IMPOSTOR — one-command test runner.
# Installs puppeteer (and chromium runtime libs on Debian/Ubuntu) if missing,
# then runs the headless smoke suite. Safe to re-run.
set -e
cd "$(dirname "$0")"

if ! node -e "require('puppeteer')" 2>/dev/null; then
  echo "[tests] installing puppeteer..."
  npm install --no-fund --no-audit --loglevel=error puppeteer
fi

if command -v apt-get >/dev/null && ! ldconfig -p 2>/dev/null | grep -q libnss3.so && \
   ! dpkg -l libnss3 2>/dev/null | grep -q ^ii; then
  echo "[tests] installing chromium runtime libs (sudo may prompt)..."
  sudo apt-get install -y --no-install-recommends \
    libnspr4 libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
    libgbm1 libasound2 libpango-1.0-0 libcairo2 libx11-xcb1 libxcursor1 || true
fi

node smoke.js
