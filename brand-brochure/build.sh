#!/bin/sh
# Renders brand-brochure/brand.html → brand-brochure/nader-brand-brochure.pdf
# (A4 landscape tri-fold, 303 × 216 mm incl. 3 mm bleed; page 1 = outside, page 2 = inside)
cd "$(dirname "$0")"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
BASE="file://$(pwd | sed 's/ /%20/g')/brand.html"
"$CHROME" --headless=new --disable-gpu --no-pdf-header-footer --allow-file-access-from-files \
  --virtual-time-budget=8000 --print-to-pdf="nader-brand-brochure.pdf" "$BASE" 2>/dev/null
[ "$1" = "--guides" ] && "$CHROME" --headless=new --disable-gpu --no-pdf-header-footer --allow-file-access-from-files \
  --virtual-time-budget=8000 --print-to-pdf="guides.pdf" "$BASE?guides" 2>/dev/null
echo "→ brand-brochure/nader-brand-brochure.pdf"
