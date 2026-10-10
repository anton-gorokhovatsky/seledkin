const chooser = document.querySelector("[data-recipe-chooser]");
if (chooser) {
  const buttons = [...chooser.querySelectorAll("[data-ingredient]")];
  const records = [...document.querySelectorAll("[data-recipe-material]")];
  const opening = document.querySelector("[data-recipe-opening]");
  const collections = document.querySelector("#meals");
  const jump = document.querySelector(".recipe-jump");
  const heading = document.querySelector("[data-recipe-directory-title]");
  const status = chooser.querySelector("[data-recipe-filter-status]");
  const allStatus = status.textContent;
  function render() {
    const requested = new URL(location.href).searchParams.get("ingredient");
    const ingredient = buttons.some(button => button.dataset.ingredient === requested) ? requested : "all";
    for (const button of buttons) button.setAttribute("aria-pressed", String(button.dataset.ingredient === ingredient));
    document.body.dataset.ingredient = ingredient;
    for (const record of records) record.hidden = ingredient === "all" ? record.hasAttribute("data-featured") : record.dataset.ingredientGroup !== ingredient;
    opening.hidden = collections.hidden = jump.hidden = ingredient !== "all";
    heading.textContent = ingredient === "all" ? "Ещё на кухне" : buttons.find(button => button.dataset.ingredient === ingredient).firstChild.textContent;
    const count = records.filter(record => !record.hidden).length;
    status.textContent = ingredient === "all" ? allStatus : `${count} ${count === 1 ? "материал" : count < 5 ? "материала" : "материалов"}`;
  }
  for (const button of buttons) button.addEventListener("click", () => {
    const url = new URL(location.href);
    button.dataset.ingredient === "all" ? url.searchParams.delete("ingredient") : url.searchParams.set("ingredient", button.dataset.ingredient);
    url.hash = "";
    history.pushState(null, "", url);
    render();
  });
  window.addEventListener("popstate", render);
  render();
  chooser.hidden = false;
}
