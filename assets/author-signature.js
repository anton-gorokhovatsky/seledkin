import { seaMotionState } from "./sea-motion.js";

const signatures = [...document.querySelectorAll("ag-signature")];

function syncSignatureMotion() {
  const { allowed, menuOpen } = seaMotionState();
  for (const signature of signatures) {
    signature.toggleAttribute("paused", !allowed || menuOpen);
  }
}

if (signatures.length) {
  syncSignatureMotion();
  document.addEventListener("seledkin:seamotionchange", syncSignatureMotion);
  // Load the shared component independently: a network failure leaves the author link usable.
  import("https://gorokhovatsky.tech/signature/v1/signature.js?v=1.0.4").catch(() => {});
}
