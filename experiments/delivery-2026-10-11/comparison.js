const root = "/experiments/delivery-2026-10-11/";
const choices = [...document.querySelectorAll("[data-variant]")];
const descriptions = {
  "01-waybill": "Лавочная накладная: цена и три условия читаются сразу, затем — заказ и фотография. Повтор условий и лишние линии убраны.",
  "02-path": "Путь заказа: выбор в каталоге, отправка списка, доставка. Исходная фотография сопровождает последовательность действий.",
};
let selected = "01-waybill";
function update() {
  const theme = document.querySelector('[name="watch"]:checked').value;
  document.querySelector("[data-frames]").dataset.screen = document.querySelector('[name="screen"]:checked').value;
  for (const button of choices) button.setAttribute("aria-pressed", String(button.dataset.variant === selected));
  document.querySelector("[data-note]").textContent = descriptions[selected];
  for (const [side, slug] of [["current", "00-current"], ["variant", selected]]) {
    const href = `${root}${slug}/?theme=${theme}&audit=delivery-preview#delivery`;
    document.querySelector(`[data-${side}-frame]`).src = href;
    document.querySelector(`[data-${side}-open]`).href = href;
  }
}
for (const button of choices) button.addEventListener("click", () => { selected = button.dataset.variant; update(); });
document.querySelector(".delivery-board__controls").addEventListener("change", update);
