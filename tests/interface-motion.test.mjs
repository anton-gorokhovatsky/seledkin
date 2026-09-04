import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createMorph } from "../assets/morphicons-dom.js";
import { iconPaths, iconSpring } from "../assets/interface-motion.js";

function clock(run) {
  const original = Object.fromEntries(["matchMedia", "requestAnimationFrame", "cancelAnimationFrame"].map(key => [key, globalThis[key]]));
  const frames = new Map();
  let id = 0;
  let now = 0;
  let reduce = false;
  globalThis.matchMedia = () => ({ matches: reduce });
  globalThis.requestAnimationFrame = fn => { frames.set(++id, fn); return id; };
  globalThis.cancelAnimationFrame = key => frames.delete(key);
  const step = () => {
    now += 1000 / 60;
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach(fn => fn(now));
  };
  try {
    run({ step, frames, reduce: value => { reduce = value; } });
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
}

for (const [from, to] of [["menu", "close"], ["moon", "sun"], ["sun", "moon"]]) {
  test(`${from} to ${to}: real driver settles exactly and survives reversal`, () => clock(({ step, frames }) => {
    let d = "";
    const writes = [];
    const morph = createMorph({ setAttribute: (name, value) => { assert.equal(name, "d"); d = value; writes.push(value); } }, iconPaths[from], { reducedMotion: "user" });
    assert.equal(d, iconPaths[from]);
    morph.morphTo(iconPaths[to], iconSpring);
    for (let i = 0; i < 5; i++) step();
    assert.notEqual(d, iconPaths[from]);
    assert.notEqual(d, iconPaths[to]);
    const interrupted = d;
    morph.morphTo(iconPaths[from], iconSpring);
    assert.equal(d, interrupted, "retargeting must preserve the current frame");
    for (let i = 0; i < 4; i++) step();
    morph.morphTo(iconPaths[to], iconSpring);
    for (let i = 0; i < 60; i++) step();
    assert.equal(d, iconPaths[to]);
    assert.equal(frames.size, 0, "settled icons must not keep an animation loop");
    assert.ok(writes.every(path => !/NaN|Infinity/.test(path)));
    morph.destroy();
  }));
}

test("reduced motion swaps both pairs immediately, without scheduling a frame", () => clock(({ frames, reduce }) => {
  reduce(true);
  for (const [from, to] of [["menu", "close"], ["moon", "sun"]]) {
    let d;
    const morph = createMorph({ setAttribute: (_, value) => { d = value; } }, iconPaths[from], { reducedMotion: "user" });
    morph.morphTo(iconPaths[to], iconSpring);
    assert.equal(d, iconPaths[to]);
    assert.equal(frames.size, 0);
    morph.destroy();
  }
}));

test("enhancement is independent of navigation, local on every page, and preserves static fallbacks", async () => {
  for (const file of ["index.html", "catalog/index.html", "404.html"]) {
    const page = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.match(page, /<script type="module" src="(?:\.\.\/)?assets\/interface-motion\.js"><\/script>/);
    assert.match(page, /styles\.css\?v=journeys-1/, "new enhancement must not combine with stale CSS");
    assert.match(page, /class="theme-toggle__moon"/);
    assert.match(page, /class="theme-toggle__sun"/);
  }
  const script = await readFile(new URL("../assets/interface-motion.js", import.meta.url), "utf8");
  assert.match(script, /reducedMotion: "user"/);
  assert.match(script, /reducedMotion\.addEventListener\("change", settle\)/);
  assert.doesNotMatch(script, /addEventListener\("click"|\.innerHTML|icon-harpoon/);
  const styles = await readFile(new URL("../assets/styles.css", import.meta.url), "utf8");
  assert.match(styles, /\.floating-menu__morph\s*\{[^}]*position: absolute;[^}]*width: 24px;[^}]*height: 24px;/s);
  assert.match(styles, /\.theme-toggle__mark\[data-morph-ready\] \.theme-toggle__sun > circle\s*\{\s*display: none;/);
  assert.equal((iconPaths.sun.match(/M/g) ?? []).length, 1, "sun rays must not multiply the moon contour in flight");
});
