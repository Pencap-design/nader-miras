#!/bin/sh
# Renders print/invitation.html → print/nader-miras-invitation.pdf (A5 landscape + 3 mm bleed)
cd "$(dirname "$0")"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
URL="file://$(pwd | sed 's/ /%20/g')/invitation.html"
"$CHROME" --headless=new --disable-gpu --no-pdf-header-footer --allow-file-access-from-files \
  --virtual-time-budget=6000 --print-to-pdf="nader-miras-invitation.pdf" "$URL" 2>/dev/null
echo "→ print/nader-miras-invitation.pdf"
