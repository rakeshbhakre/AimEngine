# THE IMPOSTOR

A browser game where an AI watches how you play — then uses it against you.

## Run it

1. Open `index.html` in Chrome/Edge — **double-click works** (file://), no build step,
   no server needed. Optional: `python3 -m http.server` → http://localhost:8000.
2. Allow webcam access when prompted.
3. Controls: **WASD** move · **Mouse** aim · **Click/hold** fire.
4. `?debug=1` at the end of the URL skips the camera and uses a synthetic subject.

## Code structure

The game is split into **22 ordered classic-script modules** under `js/` plus a
standalone stylesheet — no ES modules, no bundler, so `file://` still works. Each
file shares the global scope; load order in `index.html` is the dependency order.
Keep the numbering stable.

```
index.html        shell: UI markup + script tags            (~100 lines)
css/style.css     all UI/HUD styling
build-standalone.py  edit-then-rebuild tool (see below)
dev-server.py        optional local server (python3 dev-server.py → :8000)
tests/            headless smoke suite (smoke.js + run-tests.sh)
js/
  00-config.js        CONFIG: API keys, provider chain, ?debug flag          ← edit keys here
  01-core.js          helpers ($, clamp, rand, dist2, now, DIRV)
  02-audio.js         procedural WebAudio (tones, noise, sweeps, sfx)
  03-state-input.js   game-state enum, shared globals, input listeners
  04-tracker.js       behavior tracker + computeProfile (all profile stats)
  05-world.js         THREE: renderer, bloom, floor canvas, walls, floaters, stars
  06-battlefield.js   pillars, reactor core + EMP, pylons, beams, orbit shards
  07-player.js        player object + webcam billboard sprite
  08-particles.js     particle pool + spawnParticles
  09-projectiles.js   projectile pools, firing, pillar blocking
  10-enemies.js       drone/hunter meshes (animated assemblies) + AI movement
  11-impostor.js      impostor brain: strategies, predictions, blinks, volleys
  12-fx-player.js     glitch FX, damage, full player movement + instrumentation
  13-collisions.js    hitbox/swept collision pass
  14-roundflow.js     deaths, round lifecycle, the peel + impostor sprite visuals
  15-ai.js            between-rounds AI: OMNI→OpenRouter→Anthropic→fallback + endRound
  16-ui.js            end screens + live profile panel
  17-vision.js        webcam segmentation + FaceLandmarker (vision telemetry)
  18-stress.js        expression classifier + stress fusion + heartbeat
  19-scan.js          scanning intro sequence
  20-sync3d.js        canvas→3D sync, camera, HUD projections, main loop
  21-boot.js          boot: vision init, scan, round 1, loop start
```

### Dev workflow

The modules are the **source of truth**. To also keep the one-file artifact fresh:

```
# 1. edit anything under js/ or css/
# 2. rebuild the single-file bundle (never hand-edit it)
python3 build-standalone.py     # -> index-standalone.html
# 3. sanity
for f in js/*.js; do node --check "$f"; done
```

`index.html` + `js/` + `css/` and the standalone bundle are **behavior-identical by
construction** (the build inlines byte-for-byte what the browser would load).

### Headless test suite

`tests/` contains the full smoke harness (previously rebuilt ad-hoc every session):

```
cd tests && ./run-tests.sh        # installs puppeteer/chromium libs if needed
# → 14 checks: A) modular boots, B) standalone boots,
#   C) prediction moment, shard halo, R3 volley, rage phase, win path, zero errors
node tests/smoke.js               # once puppeteer is available (any resolve path)
```

Screenshots from runs land in `test-shots/`. Extend smoke.js with new checks
whenever you add a mechanic — C6/C7 cover the rage phase pattern.

Adding a feature? Find the module by topic above — e.g. new enemy type →
`10-enemies.js`; new profile stat → `04-tracker.js` + `16-ui.js`; new battlefield
object → `06-battlefield.js` (+ registration in `14-roundflow.js` if it needs
rebuilding per round).

**Now in 3D.** The arena is a dark neon chamber rendered with Three.js (r147, UMD —
no modules, no build): perspective camera with follow/parallax/recoil/shake, rising
energy walls with flickering charge marks, void floaters, starfield, and UnrealBloom
post-processing. Your webcam segmentation is composited onto a 3D billboard, and the
Impostor peels off you as a fragmented red copy that stands in the same space with a
halo of orbiting crimson shards. The AI's call-outs ("IMPOSTOR PREDICTS: → DODGE LEFT")
are projected into the scene above the Impostor's head. All logic, difficulty tuning,
AI provider chain, and win/death paths are identical to the 2D original (kept as
`2d-classic.html`).

## The battleground

- **Reactor core** — a twin-ringed gyro spinning at the arena center that periodically
  discharges an **EMP pulse** (the "REACTOR PULSE" warning) that clears *all hostile
  fire* — time your aggression around its 24s cycle.
- **Cover pillars** — hexagonal pylons (2 in R1, 3 in R2, 4 in R3) that physically
  **block projectiles**. You, enemies, and the Impostor all walk around them — and
  they soak 48 damage before collapsing in a shower of sparks. Cover is real cover.
- **Kinetic enemies** — drones are gyro-ringed turrets with spinning cores, orbital
  fins, and pulsing hearts; hunters are elongated seeker darts with counter-rotating
  blades that *turn to face their travel direction*, squash when telegraphing, and
  stretch when lunging.
- **RAGE PROTOCOL (round-3 boss phase)** — push the Impostor under 40% HP in the
  final round and it drops every adaptive pretense: +25% speed, wider red-fragment
  dissociation, half-rate blink cooldown, faster cycling, and its 3-shot spacing
  fan becomes a **5-shot fan**. Its HP bar inflames, it announces
  "ALL CONSTRAINTS WITHDRAWN", and the floor note reads
  "IT STOPPED ADAPTING. IT STARTED KILLING."
- **Live scenery** — corner pylons brighten as you pass, edge beams breathe, wall
  charge marks turn red while your copy is loose, and every projectile drags a
  particle trail.

## Subject feed (face + vital monitoring)

Bottom-left, whenever the camera is up: a live **subject feed** box showing *you*,
mirrored, with a scanline sweep. Beneath it the game classifies your **expression**
(MediaPipe FaceLandmarker blendshapes — GRINNING / STARTLED / SUSPICIOUS / FOCUSED /
TENSE / PANICKING) and measures a live **stress level** (0–100%) fused from face
tension (brow furrow, eye squint, fidget energy), your HP, incoming fire, the
Impostor's proximity, and mouse wobble. Nothing ever leaves your browser — it's all
local ML inference. High stress pulses the screen edges red and plays a heartbeat you
can hear. The Impostor reads your vitals too: they go into its AI prompt, feed its
taunts ("Your vitals betrayed you — 91% spike"), and nudge spawn pacing. Camera off
or denied? The box falls back to SYNTH mode and estimates stress from input only.

## What the Impostor learns about you

The behavior tracker samples you every frame — all local, nothing leaves the browser.
The profile panel (top-right) shows it measuring you live:

| Parameter | Tracked as | Exploited by |
|---|---|---|
| Dodge direction | left/right/up/down counts after each threat | R2 `exploit_dodge` pre-positions on your predictable side |
| Dodge distance | avg px covered per dodge | Impostor *leads* its shots by your dodge reach |
| Reaction time | ms from enemy shot to your key change | slow reactions → `ambush` strategy |
| Territory preference | center/edge/corner + playground quadrant time-share | `exploit_position` routes interception lanes |
| Movement rhythm | reversal interval (EWMA of direction changes) | R3 **RHYTHM LOCKED**: volleys timed to land as you turn |
| Stillness | % of frames you don't move | stationary players get sniped dead-on, no lead |
| Move speed | avg px/s while moving | intercept vector scaling |
| Fire style | burst length, shots per trigger-hold | high aggression / long bursts → `bait` |
| Panic fire | % of shots fired under 30 HP | folded into aggression pressure |
| Fire-back discipline | shots answered within 500ms of incoming fire | AI aggression pacing |
| Aim accuracy | ° offset from nearest hostile at fire moment | dodge angles chosen outside your cone |
| Hand wobble | mouse speed (px/s) | measures calm vs. panic tracking |
| Panic pattern | direction you push when cornered at low HP | R3 flank denial |
| Pattern confidence | weighted sample coverage across all of the above | how boldly the Impostor commits |

Every parameter feeds both the local fallback mind and the remote AI providers
(the full profile + raw stats are included in the between-rounds prompt), so the
taunt quotes your real numbers — "You cycle every 1.2 seconds." — and predictions
get sharper the longer you play.

## Run it

1. Open `index.html` in Chrome/Edge (any modern browser). That's it — no build, no server.
2. Allow webcam access when prompted (it composites *you* into the game world).
3. Controls: **WASD** move · **Mouse** aim · **Click/hold** fire.

## Give the Impostor a mind (AI providers)

All providers are configured in the `CONFIG` block at the top of the script.
Set `PROVIDER: "auto"` (default) and the game tries them in this order:

**OMNI AI → OpenRouter → Anthropic → local fallback mind**

If a provider fails (network, rate limit, bad JSON, CORS), the chain falls through
automatically. With no keys at all, the game runs on a deterministic local mind —
fully playable either way.

### Option A — OpenRouter (FREE)

1. Sign up at [openrouter.ai](https://openrouter.ai) (email/GitHub, **no card needed**).
2. Create a key at openrouter.ai/keys.
3. Paste it into the config:

```js
OPENROUTER_API_KEY: "sk-or-v1-...",
OPENROUTER_MODEL: "openrouter/free",   // auto-picks a free model
```

- `openrouter/free` is always free (≈20 req/min, 50 req/day unfunded — the game
  makes only ~2 calls per run, so this is plenty).
- Prefer a specific model? Use any `:free` variant, e.g.
  `meta-llama/llama-3.3-70b-instruct:free`,
  `deepseek/deepseek-chat-v3-0324:free`,
  `google/gemma-3-27b-it:free`.
- Note: free-tier requests may be logged by the upstream provider (no personal
  data is sent — only the behavioral stats shown on the panel).

### Option B — OMNI AI (ideamart.io)

1. Get an OMNI AI key (hackathon dashboard / ideamart.io).
2. Paste it in:

```js
OMNIAI_API_KEY: "app_xxxx....",
OMNIAI_MODEL: "gemini-2.5-flash-lite",   // or claude-sonnet-4 | gemini-2.5-pro | gpt-4o-mini
```

Auth is sent as a raw `Authorization` header (no `Bearer` prefix), per ideamart docs.

### Option C — Anthropic direct

```js
ANTHROPIC_API_KEY: "sk-ant-...",
ANTHROPIC_MODEL: "claude-sonnet-4-6",
```

### Force a provider

```js
PROVIDER: "openrouter",   // or "omniai" | "anthropic" | "local" | "auto"
```

The active mind is surfaced in-game: top-left HUD shows the chain (`MIND: OMNI AI
(gemini-2.5-flash-lite) → OPENROUTER (openrouter/free) → LOCAL FALLBACK · ACTIVE:
OPENROUTER`), and each taunt is attributed (`THE IMPOSTOR · MIND: OMNI AI`).

## No webcam / development

- `DEBUG_MODE: true` in the file, **or** append `?debug=1` to the URL.
- Uses a synthetic silhouette; behavior tracker + AI + all rounds work normally.
- If the webcam is unavailable or MediaPipe fails to load, the game falls back
  to the synthetic subject automatically.

## What's inside

| System | Implementation |
|---|---|
| Renderer | PixiJS v7 (WebGL) via CDN |
| Player compositing | MediaPipe Image Segmenter (deeplab_v3) @ 15fps |
| Tension signal | MediaPipe FaceLandmarker (lean in/out → ±15% spawn rate) |
| Behavioral profile | Pure-JS tracker: dodge direction, position, aggression, reaction time, panic |
| Impostor mind | OMNI AI / OpenRouter / Anthropic (failover chain) → strategy config; rule-based state machine executes it |
| Impostor body | A fragmented, red-inverted copy of *your own* silhouette |
| Audio | Procedural WebAudio (no assets) |

## The 5-minute arc

Rounds are **survival gauntlets** — enemies spawn continuously up to an alive cap;
there is no killing your way to an early exit. Standing still is a death sentence.

1. **Round 1 — Calibration (60s).** Up to 4 drones alive, single aimed shots.
2. **Round 2 — Materialization (90s).** Drone **3-shot bursts** with leading aim,
   **hunters that lunge into the side you habitually dodge toward** (red flash
   telegraph), and the Impostor with 100 HP, punish shots at your predicted dodge
   side, and blink-repositioning when you focus fire.
3. **Round 3 — Confrontation (120s).** 150 HP Impostor, `predict_and_intercept`,
   **3-way spread volleys leaded on your velocity**, faster enemy projectiles,
   +15%/round enemy HP scaling. Kill it or outlast it: `PATTERN BROKEN`.

+25 HP restored between rounds. Blink, lunge, and volley all use your own recorded
profile — the game gets harder the *more legible* you are.

`test-shots/` contains headless-browser screenshots of automated playthroughs,
including mocked-provider runs (OpenRouter / OMNI AI taunts).
