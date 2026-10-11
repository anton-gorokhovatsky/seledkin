import { setupAssortmentPreview } from "/assets/assortment-preview.js";
setupAssortmentPreview();
addEventListener("load", () => {
  const top = document.querySelector("#delivery").getBoundingClientRect().top + scrollY - 88;
  scrollTo({ top, behavior: "instant" });
}, { once: true });
