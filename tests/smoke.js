/* THE IMPOSTOR — tests/smoke.js
   Headless end-to-end smoke suite (puppeteer). Serves the project over http,
   and verifies the modular build, the standalone bundle, and core gameplay.

   First time:
       npm install puppeteer               # in this tests/ folder
       ./run-tests.sh                       # also apt-installs chromium libs on Linux
   Then just:
       node tests/smoke.js   (from repo root)

   Exit code 0 = all scenarios passed.
*/
const http = require("http");
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const SHOTS = path.join(ROOT, "test-shots");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".png": "image/png" };

const server = http.createServer((req, res) => {
  let p = req.url.split("?")[0];
  if (p === "/") p = "/index.html";
  fs.readFile(path.join(ROOT, p), (e, d) => {
    if (e) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" });
    res.end(d);
  });
});
const wait = ms => new Promise(r => setTimeout(r, ms));
let failed = 0, passed = 0;

function check(name, cond, detail) {
  if (cond) { passed++; console.log("  PASS  " + name + (detail ? "  [" + detail + "]" : "")); }
  else { failed++; console.log("  FAIL  " + name + (detail ? "  [" + detail + "]" : "")); }
}

async function freshPage(browser, url, errors) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  page.on("pageerror", e => errors.push(e.message));
  page.on("requestfailed", r => { if (!/favicon/.test(r.url())) errors.push("REQFAIL:" + r.url().slice(-70)); });
  await page.goto(url, { waitUntil: "load", timeout: 60000 });
  for (let i = 0; i < 25; i++) {
    if (await page.evaluate(() => typeof state !== "undefined" && state === "playing").catch(() => false)) break;
    await wait(600);
  }
  return page;
}

(async () => {
  const puppeteer = require("puppeteer");
  await new Promise(r => server.listen(8970, r));
  console.log("== THE IMPOSTOR — smoke suite ==");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--enable-unsafe-swiftshader", "--mute-audio", "--allow-file-access-from-files"]
  });

  // A. modular build over http
  {
    const errors = [];
    const page = await freshPage(browser, "http://localhost:8970/index.html?debug=1", errors);
    const p = await page.evaluate(() => ({
      state, round, pillars: pillars.length,
      cambox: document.getElementById("cam-box").style.display,
      three: THREE.REVISION
    }));
    check("A1 modular boots to playing", p.state === "playing", JSON.stringify(p));
    check("A2 battlefield up", p.pillars > 0 && p.cambox === "block");
    check("A3 zero page errors", errors.length === 0, errors.join(" | "));
    await page.close();
  }

  // B. standalone bundle over file://
  {
    const errors = [];
    const page = await freshPage(browser, "file://" + ROOT + "/index-standalone.html?debug=1", errors);
    const p = await page.evaluate(() => ({ state, pillars: pillars.length }));
    check("B1 standalone boots to playing", p.state === "playing", JSON.stringify(p));
    check("B2 zero page errors", errors.length === 0, errors.join(" | "));
    await page.close();
  }

  // C. full gameplay: prediction moment, rage phase, win path
  {
    const errors = [];
    const page = await freshPage(browser, "http://localhost:8970/index.html?debug=1", errors);
    await page.evaluate(() => {
      tracker.dodgeDirections.left = 8; tracker.dodgeDirections.right = 1;
      tracker.dodgeDistances = [120, 140, 110, 130]; tracker.reactionTimes = [340, 410];
      computeProfile(); roundTimeLeft = 0.3; damagePlayer(25); updateHpBar();
    });
    let ok = false;
    for (let i = 0; i < 40; i++) {
      if (await page.evaluate(() => state === "playing" && round === 2 && impostor.active &&
        impostor.strategy && impostor.strategy !== "observe" && !impostor.peel)) { ok = true; break; }
      await wait(700);
    }
    check("C1 R2 strategy applied", ok);
    await page.evaluate(() => { impostor.x = player.x - 180; impostor.y = player.y - 40; impostor.fireCd = 0; });
    await wait(900);
    await page.keyboard.down("KeyA"); await wait(700); await page.keyboard.up("KeyA");
    const r2 = await page.evaluate(() => ({
      strat: impostor.strategy, shards: impShards.visible, pred: impostor.prediction,
      label: document.getElementById("pred-b").textContent
    }));
    check("C2 prediction label live", r2.label.includes("DODGE"), JSON.stringify(r2));
    check("C3 shard halo visible in R2", r2.shards === true);

    await page.evaluate(() => { player.hp = 100; updateHpBar(); roundTimeLeft = 0.5; });
    ok = false;
    for (let i = 0; i < 30; i++) {
      if (await page.evaluate(() => state === "playing" && round === 3 && impostor.active && !impostor.peel)) { ok = true; break; }
      await wait(800);
    }
    check("C4 R3 reached", ok);
    await page.evaluate(() => { impostor.x = player.x - 300; impostor.y = player.y; impostor.fireCd = 0; impostor.freezeT = 0; });
    await wait(1600);
    const volley = await page.evaluate(() => iProj.filter(p => p.active).length);
    check("C5 3-shot volley", volley === 3, "active=" + volley);

    // rage phase: push under 40% hp
    await page.evaluate(() => { impostor.hp = Math.floor(impostor.maxHp * 0.55); });
    await wait(400);
    await page.evaluate(() => { impostor.hp = Math.floor(impostor.maxHp * 0.3); impostor.freezeT = 0; });
    await wait(800);
    const rage = await page.evaluate(() => ({ rage: impostor._rage }));
    check("C6 rage phase triggers under 40% hp", rage.rage === true);
    await page.evaluate(() => {
      iProj.forEach(p => { p.active = false; p.mesh.visible = false; });
      impostor.fireCd = 0;
    });
    await wait(1200);
    const rageVolley = await page.evaluate(() => iProj.filter(p => p.active).length);
    check("C7 rage 5-shot fan", rageVolley === 5, "active=" + rageVolley);
    await page.screenshot({ path: path.join(SHOTS, "80-rage.png") });

    // win
    await page.evaluate(() => { impostor._rage = false; impostor.hp = 5;
      fireProj(pProj, impostor.x - 40, impostor.y, impostor.x, impostor.y, 600, 25, 6, 2.0); });
    let won = false;
    for (let i = 0; i < 12; i++) { if (await page.evaluate(() => state === "win")) { won = true; break; } await wait(500); }
    check("C8 win path", won, await page.evaluate(() => document.getElementById("go-result").textContent));
    check("C9 zero page errors", errors.length === 0, errors.join(" | "));
    await page.close();
  }

  await browser.close();
  server.close();
  console.log(`== RESULT: ${passed} passed, ${failed} failed ==`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error("CRASH", e); process.exit(1); });