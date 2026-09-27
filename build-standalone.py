#!/usr/bin/env python3
"""
THE IMPOSTOR — build-standalone.py

Regenerates index-standalone.html (the single-file artifact) from the modular
sources: index.html + css/style.css + js/*.js in load order.

Run after editing any module:
    python3 build-standalone.py

Source of truth = the modules. The standalone file is a BUILD OUTPUT — do not
edit it by hand.
"""
import glob
import os
import re
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))


def read(p):
    with open(os.path.join(ROOT, p), encoding="utf-8") as f:
        return f.read()


def main():
    shell = read("index.html")

    # 1. inline the stylesheet
    css = read("css/style.css")
    shell, n = re.subn(
        r'<link rel="stylesheet" href="css/style\.css">',
        "<style>\n" + css + "\n</style>",
        shell,
    )
    if n != 1:
        sys.exit("ERROR: expected exactly one stylesheet <link> in index.html")

    # 2. inline every js module in HTML order
    def inline_js(m):
        src = m.group(1)
        path = os.path.join("js", src)
        if not os.path.exists(os.path.join(ROOT, path)):
            sys.exit("ERROR: module missing on disk: " + path)
        code = read(path).rstrip("\n")
        return "<script>\n" + code + "\n</script>"

    shell, n = re.subn(r'<script src="js/([^"]+)"></script>', inline_js, shell)
    js_files = [os.path.basename(f) for f in glob.glob(os.path.join(ROOT, "js", "*.js"))]
    if n != len(js_files):
        sys.exit(f"ERROR: {n} script tags inlined but {len(js_files)} modules on disk "
                 "— index.html load list is out of sync")

    out = os.path.join(ROOT, "index-standalone.html")
    with open(out, "w", encoding="utf-8") as f:
        f.write(shell)
    print(f"OK: {n} js modules + css inlined -> index-standalone.html "
          f"({os.path.getsize(out)//1024} KB)")


if __name__ == "__main__":
    main()
