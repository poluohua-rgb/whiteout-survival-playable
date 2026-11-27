#!/bin/bash
# Plays the shipped single-file build (../index.html) at each viewport.
# Needs `npm ci` and Chrome at /usr/local/bin/google-chrome. Results go to ./verify-out.
cd "$(dirname "$0")"
F=../index.html
O=verify-out
mkdir -p $O
sha256sum $F > $O/sha.txt
node tools-play.mjs --file $F --w 390 --h 844 --dpr 3 --input touch --out $O --tag rt-390x844-touch --replay --poll 120 > $O/A.log 2>&1
node tools-play.mjs --file $F --w 1440 --h 900 --input mouse --out $O --tag rt-1440x900-mouse --query "?q=0" --replay --poll 120 > $O/B.log 2>&1
node tools-play.mjs --file $F --w 1920 --h 1080 --input keys --out $O --tag rt-1920x1080-keys --poll 120 > $O/C.log 2>&1
node tools-play.mjs --file $F --w 844 --h 390 --dpr 2 --input touch --out $O --tag st-844x390-touch --step --query "?q=0" --resizeTo 390x844 > $O/D.log 2>&1
node tools-play.mjs --file $F --w 820 --h 1180 --input touch --out $O --tag st-820x1180-touch --step --query "?q=0" > $O/E.log 2>&1
node tools-play.mjs --file $F --w 1180 --h 820 --input mouse --out $O --tag st-1180x820-mouse --step --query "?q=0" > $O/F.log 2>&1
echo done > $O/DONE
