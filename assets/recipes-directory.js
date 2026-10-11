import { revealChange } from "./interaction-feedback.js";

const chooser = document.querySelector("[data-recipe-chooser]");
if (chooser) {
  const buttons = [...chooser.querySelectorAll("[data-ingredient]")];
  const records = [...document.querySelectorAll("[data-recipe-material]")];
  const opening = document.querySelector("[data-recipe-opening]");
  const features = [...opening.querySelectorAll("[data-recipe-feature]")];
  const pair = opening.querySelector(".recipe-editorial-pair");
  const directory = document.querySelector(".recipe-record-directory");
  const collections = document.querySelector("#meals");
  const jump = document.querySelector(".recipe-jump");
  const heading = document.querySelector("[data-recipe-directory-title]");
  const status = chooser.querySelector("[data-recipe-filter-status]");
  const allStatus = status.textContent;
  function render(animate = false) {
    const requested = new URL(location.href).searchParams.get("ingredient");
    const ingredient = buttons.some(button => button.dataset.ingredient === requested) ? requested : "all";
    for (const button of buttons) button.setAttribute("aria-pressed", String(button.dataset.ingredient === ingredient));
    document.body.dataset.ingredient = ingredient;
    for (const record of records) record.hidden = record.hasAttribute("data-featured") || (ingredient !== "all" && record.dataset.ingredientGroup !== ingredient);
    for (const feature of features) feature.hidden = ingredient !== "all" && feature.dataset.ingredientGroup !== ingredient;
    pair.hidden = !features.some(feature => feature.parentElement === pair && !feature.hidden);
    opening.hidden = features.every(feature => feature.hidden);
    directory.hidden = records.every(record => record.hidden);
    collections.hidden = jump.hidden = ingredient !== "all";
    heading.textContent = ingredient === "all" ? "Ещё на кухне" : buttons.find(button => button.dataset.ingredient === ingredient).firstChild.textContent;
    const count = records.filter(record => !record.hidden).length + features.filter(feature => !feature.hidden).length;
    status.textContent = ingredient === "all" ? allStatus : `${count} ${count === 1 ? "материал" : count < 5 ? "материала" : "материалов"}`;
    if (animate) revealChange([opening.hidden ? null : opening, directory.hidden ? null : directory]);
  }
  for (const button of buttons) button.addEventListener("click", () => {
    if (button.getAttribute("aria-pressed") === "true") return;
    const url = new URL(location.href);
    button.dataset.ingredient === "all" ? url.searchParams.delete("ingredient") : url.searchParams.set("ingredient", button.dataset.ingredient);
    url.hash = "";
    history.pushState(null, "", url);
    render(true);
    document.dispatchEvent(new CustomEvent("shop:goal", { detail: {
      goal: "product_select", params: { context: "recipes", action: "ingredient_filter",
        ingredient: button.dataset.ingredient,
        count: records.filter(record => button.dataset.ingredient === "all" || record.dataset.ingredientGroup === button.dataset.ingredient).length },
    } }));
  });
  window.addEventListener("popstate", () => render(true));
  render();
  chooser.hidden = false;
}
