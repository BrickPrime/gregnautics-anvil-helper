#!/usr/bin/env python3
"""Assemble index.html from src/ + data/recipes.json.

The page is a single self-contained file. Its Content-Security-Policy only
allows the exact inline <style> and <script> shipped here (SHA-256 hashes),
so any injected script or style would be refused by the browser.
"""
import base64
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
tpl = (ROOT / "src" / "template.html").read_text(encoding="utf-8")
style = (ROOT / "src" / "style.css").read_text(encoding="utf-8")
script = (ROOT / "src" / "app.js").read_text(encoding="utf-8")
data = json.loads((ROOT / "data" / "recipes.json").read_text(encoding="utf-8"))

# JSON inside <script type="application/json">: escape "<" so the data can never close the tag.
data_txt = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")

def sha(s: str) -> str:
    return "'sha256-" + base64.b64encode(hashlib.sha256(s.encode("utf-8")).digest()).decode() + "'"

csp = "; ".join([
    "default-src 'none'",
    f"script-src {sha(script)}",
    f"style-src {sha(style)}",
    "img-src data:",
    "base-uri 'none'",
    "form-action 'none'",
    "object-src 'none'",
    "require-trusted-types-for 'script'",
])

for marker in ("__CSP__", "__STYLE__", "__SCRIPT__", "__DATA__"):
    assert tpl.count(marker) == 1, marker
out = (tpl.replace("__CSP__", csp)
          .replace("__STYLE__", style)
          .replace("__DATA__", data_txt)
          .replace("__SCRIPT__", script))
(ROOT / "index.html").write_text(out, encoding="utf-8")
print(f"index.html written ({len(out) // 1024} KB, {len(data['recipes'])} recipes)")
