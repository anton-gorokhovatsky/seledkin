import { test, expect } from "@playwright/test";
const measure = headings => headings.flatMap(h => {
  const n=h.firstChild;
  return [...n.textContent.matchAll(/[А-Яа-яЁё]+/g)].flatMap(m => {
    const r=document.createRange(); r.setStart(n,m.index);r.setEnd(n,m.index+m[0].length);
    const rects=[...r.getClientRects()].map(x=>({top:x.top,width:x.width,height:x.height}));
    return new Set(rects.filter(x=>x.width>0 && x.height>0).map(x=>Math.round(x.top))).size>1 ? [{word:m[0],column:h.clientWidth,font:getComputedStyle(h).fontSize,rects}] : [];
  });
});
test("measure exact resize sequence and the narrow heading scale", async ({ browser, baseURL }, info) => {
  for (const variant of ["baseline", "narrow-scale"]) {
    const context=await browser.newContext({viewport:{width:1440,height:1000}, reducedMotion:"reduce"});
    await context.addInitScript(()=>localStorage.setItem("seledkin-theme","light"));
    const page=await context.newPage();await page.goto(`${baseURL}recipes/?audit=diagnostic`);
    if(variant==="narrow-scale") await page.addStyleTag({content:"@media (width <= 34rem) { .recipes-page .meal-collection > header h3 { font-size:clamp(1.75rem, 0.75rem + 5vw, 1.9rem); } }"});
    for(const width of [1920,1512,1440,1024,980,390,320]) {
      await page.setViewportSize({width,height:900});await page.evaluate(()=>document.fonts.ready);
      const before=await page.locator(".meal-collection > header h3").evaluateAll(measure);
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const after=await page.locator(".meal-collection > header h3").evaluateAll(measure);
      console.log("WRAP_SEQUENCE", JSON.stringify({variant,width,before,after,overflow:await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)}));
      if(variant==="narrow-scale") expect(after,`Whole words at ${width}px`).toEqual([]);
    }
    await page.locator("#seafood-dinner").scrollIntoViewIfNeeded();
    await page.screenshot({path:info.outputPath(`${variant}-320.png`)});
    await context.close();
  }
});
