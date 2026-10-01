// Old public fragments remain usable. Without JS they still land on a linked row.
function openLegacyEntry() {
  const id = location.hash.match(/^#journal-entry-(\d+)$/)?.[1];
  if (!id) return;
  const link = document.querySelector(`#journal-entry-${id} > a`);
  if (link) location.replace(link.href);
}
openLegacyEntry();
window.addEventListener("hashchange", openLegacyEntry);
