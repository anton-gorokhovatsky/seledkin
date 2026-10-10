// Each photograph leads to its actual catalog position; browsing stays optional.
export function setupMobileHero() {
  const gallery = document.querySelector(".afisha__gallery");
  if (!gallery) return;
  const photos = [...gallery.querySelectorAll(".afisha__print")];
  const frame = gallery.querySelector(".afisha__frame");
  const change = gallery.querySelector(".afisha__change");
  const name = gallery.querySelector(".afisha__name");
  const price = gallery.querySelector(".afisha__price");
  const count = gallery.querySelector(".afisha__count");
  const status = gallery.querySelector(".afisha__status");
  const product = document.querySelector(".afisha__catalog");
  const order = document.querySelector(".afisha__order");
  const mobile = matchMedia("(max-width: 61.1875rem)");
  let index = 0;
  let pointerStart = null;
  let blockClick = false;

  function show() {
    if (!mobile.matches) return;
    photos.forEach((photo, i) => {
      const position = (i - index + photos.length) % photos.length;
      photo.hidden = position > 2;
      photo.dataset.position = position;
      photo.setAttribute("aria-hidden", String(position !== 0));
      const image = photo.querySelector("img[data-full-src]");
      if (!photo.hidden && image) {
        image.srcset = image.dataset.fullSrcset;
        image.src = image.dataset.fullSrc;
        delete image.dataset.fullSrc;
        delete image.dataset.fullSrcset;
      }
    });
    const current = photos[index];
    name.textContent = current.dataset.caption;
    price.textContent = current.dataset.price;
    frame.href = product.href = current.dataset.href;
    order.href = current.dataset.order;
    count.textContent = `${index + 1}/${photos.length}`;
    frame.setAttribute("aria-label", `Смотреть ${current.dataset.caption} в каталоге, ${current.dataset.price}`);
    product.setAttribute("aria-label", `Смотреть ${current.dataset.caption} в каталоге`);
    change.hidden = false;
  }

  function move(step) {
    index = (index + step + photos.length) % photos.length;
    show();
    status.textContent = `Товар ${index + 1} из ${photos.length}: ${photos[index].dataset.caption}, ${photos[index].dataset.price}`;
  }

  change.addEventListener("click", () => move(1));
  frame.addEventListener("keydown", event => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    move(event.key === "ArrowLeft" ? -1 : 1);
  });
  frame.addEventListener("pointerdown", event => {
    if (event.isPrimary) pointerStart = { id: event.pointerId, x: event.clientX, y: event.clientY };
  });
  frame.addEventListener("pointerup", event => {
    if (!pointerStart || pointerStart.id !== event.pointerId) return;
    const dx = event.clientX - pointerStart.x;
    const dy = event.clientY - pointerStart.y;
    pointerStart = null;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    blockClick = true;
    event.preventDefault();
    move(dx < 0 ? 1 : -1);
    setTimeout(() => { blockClick = false; }, 0);
  });
  frame.addEventListener("pointercancel", () => { pointerStart = null; });
  frame.addEventListener("click", event => {
    if (blockClick) event.preventDefault();
  });
  mobile.addEventListener("change", show);
  show();
}
