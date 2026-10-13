# Gregnautics Anvil Helper

A small offline web page that tells you exactly which buttons to press on the **TerraFirmaCraft anvil**, with the fewest hits possible. It covers every metal and alloy in the **Gregnautics** modpack.

Open `index.html` in any browser, on PC or phone. There is nothing to install and no server, and the page works without an internet connection.

> The interface is in French, the language of the modpack's author. Button names (Light Hit, Draw, Punch, Bend, Upset, Shrink…) are kept in English, as they appear in the game.

## The modpack

**Gregnautics** is a Minecraft **1.21.1 / NeoForge** modpack, available on CurseForge. It is built around **TerraFirmaCraft 4.2.11** and **GregTech CEu**, with Create, Firmalife, TFC Items, TFC Hammer Time, TFC Metal Tools and others. Its KubeJS scripts rework many smithing recipes: GregTech plates and rods, nuggets forged from ingots, pipes, wires, rings and screws.

This tool was built from the pack's actual files: the mod jars and the KubeJS server scripts. The recipes and rules it shows are therefore the ones used in the pack, not the vanilla TFC ones.

## The problem it solves

In TerraFirmaCraft you forge metal items on an anvil:

- A **green arrow** shows the current work position (0–150). Eight buttons move it: red ones go left (Light Hit −3, Medium Hit −6, Hard Hit −9, Draw −15) and green ones go right (Punch +2, Bend +7, Upset +13, Shrink +16).
- A **red arrow** marks the target (40–113). The item is finished when the green arrow lands *exactly* on it **and** the last three actions match the recipe's rules (for example *Punch last, Hit not last*).
- Leaving the 0–150 range destroys the metal.

Working out a short, valid sequence by hand is tedious. This page does it for you.

## Features

- **Shortest sequence.** A breadth-first search over (position, last three actions) finds the minimum number of hits for any recipe, target and starting position. It also works when you have already hit the ingot a few times.
- **Target from the world seed.** In TFC, the target depends only on the world seed and the id of the item being made. Enter the seed (from `/seed`) and every target is computed automatically. The page reimplements Minecraft's `XoroshiroRandomSource(seed).forkPositional().fromHashOf(itemId).nextInt(74) + 40`, with MD5 and Xoroshiro128++ written in plain JavaScript.
- **Manual override and cross-check.** Type the target you see in game and it is saved for that item. If it disagrees with the seed calculation, the page warns you, and tells you which candidate item id matches your value.
- **Every metal and alloy.** 568 recipes in 31 metals: copper, bronzes, brass, wrought iron, steels (including black, red, blue and stainless), gold, silver, nickel, aluminium, lead, chromium, uranium and more. Each recipe shows its required anvil tier.
- **Search** across all items and metals ("pickaxe bronze", "sheet steel"…).
- **Step-by-step mode.** Tap each step as you do it; on a phone, a bar at the bottom always shows the next hit.
- **Export / import** your saved targets as a JSON file, to move them between devices.
- **Responsive design** for phone and desktop, plus light and dark themes that follow your system.

## Security

The page is a single static file. It is built so that opening it, or hosting it on GitHub Pages, adds no attack surface:

- **Strict Content-Security-Policy.** `default-src 'none'`. Only the exact inline script and stylesheet shipped in the file may run, pinned by SHA-256 hash. Any injected script or style is refused by the browser.
- **Trusted Types enforced** (`require-trusted-types-for 'script'`). The code never uses `innerHTML`, `eval` or similar sinks. All text is inserted with `textContent`.
- **No network access.** No CDN, fonts, analytics or requests of any kind (`connect-src` is blocked through `default-src 'none'`). `referrer` is set to `no-referrer`.
- **Validated inputs.** The seed, item ids, typed targets, browser storage and imported files are all checked against strict formats and ranges. Unknown keys are dropped, and imported files are size-limited. Recipe data is embedded as an inert `application/json` block.
- **Local data only.** The seed and saved targets stay in the browser's `localStorage`.

If you host it on a server you control, also send `X-Frame-Options: DENY` (or `frame-ancestors 'none'`) as an HTTP header. These cannot be set from a `<meta>` tag.

## Accuracy notes

- **Recipes and rules** are read from the mod jars and the pack's KubeJS scripts.
- **Some output ids are uncertain.** Some items produced through GregTech depend on whether a GregTech item exists at runtime: `gtceu:<metal>_plate`, `_rod`, `_ring` and `_screw`. In those cases the page lists every candidate id under *Options avancées*. The one whose computed target matches the game is the right one.
- **Verify the target once.** The seed-to-target calculation follows Minecraft's code but has not been checked in game for every item. Forge one item, compare the red arrow with the page, and type the real value if it differs.

## Project layout

```
index.html               ← the app (generated, open this)
src/template.html        ← page structure
src/style.css            ← styles
src/app.js               ← solver, seed → target, UI
data/recipes.json        ← all anvil recipes of the pack
tools/build.py           ← assembles index.html and computes the CSP hashes
tools/extract_recipes.py ← rebuilds data/recipes.json from the unzipped mod jars
```

Rebuild after editing any file in `src/` or `data/`:

```bash
python3 tools/build.py
```

## Use it online

Enable **GitHub Pages** on this repository (Settings → Pages → *Deploy from a branch* → `main` / root). The page will then be at `https://<user>.github.io/gregnautics-anvil-helper/`, which is handy on a phone.

## Disclaimer

This is a fan project and is not affiliated with TerraFirmaCraft, GregTech CEu, Mojang or Microsoft. Minecraft is a trademark of Mojang Studios.

## License

MIT, see [LICENSE](LICENSE).
