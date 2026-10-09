// Extra photography helps identify a category. Navigation always stays a link.
export function setupAssortmentPreview(root = document) {
  const directory = root.querySelector(".assortment-directory");
  const photos = [...root.querySelectorAll("[data-assortment-photo]")];
  if (!directory || !photos.length) return;
  const desktop = matchMedia("(min-width: 61.1875rem)");
  let hovered = null;
  const category = link => link && new URL(link.href).hash.replace("#category-", "");
  const show = link => {
    const selected = desktop.matches ? category(link) : null;
    const photo = photos.find(item => item.dataset.assortmentPhoto === selected) ?? photos[0];
    photos.forEach(item => { item.hidden = item !== photo; });
    const img = photo.querySelector("img");
    if (img?.dataset.fullSrc) {
      img.srcset = img.dataset.fullSrcset;
      img.src = img.dataset.fullSrc;
      delete img.dataset.fullSrc;
      delete img.dataset.fullSrcset;
    }
  };
  const focused = () => root.activeElement?.closest(".assortment-directory__link");
  directory.querySelectorAll(".assortment-directory__link").forEach(link => {
    link.addEventListener("pointerenter", event => {
      if (event.pointerType === "touch") return;
      hovered = link;
      show(link);
    });
    link.addEventListener("focus", () => show(link));
  });
  directory.addEventListener("pointerleave", () => { hovered = null; show(focused()); });
  directory.addEventListener("focusout", event => show(event.relatedTarget?.closest?.(".assortment-directory__link") ?? hovered));
  desktop.addEventListener("change", () => show(focused() ?? hovered));
}
