import { setupAssortmentPreview } from "/assets/assortment-preview.js";
setupAssortmentPreview();
addEventListener("load", () => document.querySelector("#delivery").scrollIntoView({ block: "start", behavior: "instant" }), { once: true });
