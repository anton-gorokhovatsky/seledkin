// A desktop Telegram client can discard the URL's draft. Copy it before
// leaving the site, and keep a selectable fallback when copying is denied.
export async function copyOrderMessage(draft, { manualCopy, field, status }) {
  try {
    await navigator.clipboard.writeText(draft);
    manualCopy.hidden = true;
    status.textContent = "Текст скопирован. Вставьте его в сообщение в чате лавки.";
    return true;
  } catch {
    manualCopy.hidden = false;
    field.value = draft;
    field.focus();
    field.select();
    status.textContent = "Автоматическое копирование недоступно. Скопируйте выделенный текст и вставьте его в чат лавки.";
    return false;
  }
}

export function setupProductTelegramOrders() {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  for (const link of document.querySelectorAll('.catalog-product-order a[href^="https://t.me/+79166751452?"]')) {
    const details = link.closest("details");
    const draft = new URL(link.href).searchParams.get("text");
    if (!draft) continue;
    link.textContent = "Скопировать и\u00a0открыть Телеграм";
    const hint = document.createElement("p");
    hint.className = "catalog-product-order__hint";
    hint.textContent = "Вставьте скопированный текст в\u00a0чат лавки и\u00a0отправьте сообщение, чтобы уточнить наличие и\u00a0оформить заказ.";
    const status = document.createElement("p");
    status.className = "catalog-product-order__status";
    status.setAttribute("role", "status");
    let manualCopy;
    let field;
    let copying = false;
    details.append(hint, status);
    link.addEventListener("click", async event => {
      if (manualCopy && !manualCopy.hidden) return;
      event.preventDefault();
      if (copying) return;
      if (!manualCopy) {
        manualCopy = document.createElement("label");
        manualCopy.className = "catalog-product-order__draft";
        manualCopy.hidden = true;
        const label = document.createElement("span");
        label.textContent = "Текст для сообщения";
        field = document.createElement("textarea");
        field.readOnly = true;
        field.rows = 6;
        manualCopy.append(label, field);
        details.append(manualCopy);
      }
      copying = true;
      const copied = await copyOrderMessage(draft, { manualCopy, field, status });
      copying = false;
      hint.hidden = !copied;
      if (!copied) {
        link.textContent = "Открыть чат в\u00a0Телеграме";
        return;
      }
      const product = link.closest(".catalog-product");
      document.dispatchEvent(new CustomEvent("shop:goal", { detail: { goal: "order_click", params: {
        channel: "telegram", context: "catalog", product: product.dataset.productName,
        product_id: product.dataset.productId,
        ...(new URL(location.href).searchParams.get("from") === "afisha" ? { source: "afisha" } : {}),
      } } }));
      window.location.assign(link.href);
    });
  }
}
