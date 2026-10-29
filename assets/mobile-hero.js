import { copyOrderMessage } from "./order-message.js";

// Details and ordering both keep the photographed product; the full catalog is separate.
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
  const order = gallery.querySelector(".afisha__order");
  const orderLabel = order.querySelector(".afisha__order-label");
  const telegram = order.querySelector(".afisha__order-telegram");
  const whatsapp = order.querySelector(".afisha__order-whatsapp");
  const copyBeforeTelegram = matchMedia("(hover: hover) and (pointer: fine)");
  let copyUI;
  let copying = false;
  let selectionVersion = 0;
  const mobile = matchMedia("(max-width: 61.1875rem)");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let index = 0;
  let gesture = null;
  let motion = null;
  let dragFrame = 0;
  let motionFrame = 0;
  let blockClick = false;
  const remnants = new Map();

  const wrap = value => (value + photos.length) % photos.length;
  const positionOf = (i, selected = index) => wrap(i - selected);
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  const rotations = [-2, 4, -6];

  function loadPhoto(photo) {
    const image = photo.querySelector("img[data-full-src]");
    if (!image) return;
    image.srcset = image.dataset.fullSrcset;
    image.src = image.dataset.fullSrc;
    delete image.dataset.fullSrc;
    delete image.dataset.fullSrcset;
  }

  // Selection owns the whole product contract. Transient card poses never edit it.
  function select(next, method) {
    index = next;
    photos.forEach((photo, i) => {
      const position = positionOf(i);
      photo.dataset.position = position;
      photo.setAttribute("aria-hidden", String(position !== 0));
    });
    const current = photos[index];
    const afisha = gallery.closest(".afisha");
    afisha.dataset.productName = current.dataset.caption;
    afisha.dataset.productCategory = current.dataset.category;
    afisha.dataset.productId = current.dataset.productId;
    afisha.dataset.photoIndex = String(index + 1);
    name.textContent = current.dataset.caption;
    price.textContent = current.dataset.price;
    frame.href = current.dataset.href;
    count.textContent = `${index + 1}/${photos.length}`;
    frame.setAttribute("aria-label", `Открыть ${current.dataset.caption} в каталоге, ${current.dataset.price}`);
    orderLabel.textContent = current.dataset.orderLabel;
    telegram.href = current.dataset.telegram;
    whatsapp.href = current.dataset.whatsapp;
    telegram.textContent = copyBeforeTelegram.matches ? "Скопировать и\u00a0открыть Телеграм" : "В\u00a0Телеграме";
    selectionVersion++;
    copying = false;
    if (copyUI) {
      copyUI.manualCopy.hidden = true;
      copyUI.field.value = "";
      copyUI.status.textContent = "";
    }
    change.hidden = false;
    if (!method) return;
    status.textContent = `Товар ${index + 1} из ${photos.length}: ${current.dataset.caption}, ${current.dataset.price}`;
    document.dispatchEvent(new CustomEvent("shop:goal", { detail: { goal: "product_select", params: {
      context: "afisha", action: "preview", method, product: current.dataset.caption,
      category: current.dataset.category, product_id: current.dataset.productId, photo: index + 1,
    } } }));
  }

  function rest() {
    photos.forEach((photo, i) => {
      photo.hidden = positionOf(i) > 2;
      photo.style.removeProperty("transform");
      photo.style.removeProperty("opacity");
      photo.style.removeProperty("z-index");
      if (!photo.hidden && mobile.matches) loadPhoto(photo);
    });
    if (mobile.matches) loadPhoto(photos[wrap(index - 1)]);
    delete frame.dataset.dragging;
  }

  function clearRemnants() {
    remnants.forEach((animation, photo) => { animation.cancel(); photo.remove(); });
    remnants.clear();
  }

  function retirePhoto(photo, pose, exit, duration, easing) {
    // Keep the last transparent overlay while the real card joins the new drag.
    // It has no product identity, semantics, focus or pointer ownership.
    const remnant = photo.cloneNode(true);
    [...remnant.attributes].forEach(attribute => {
      if (attribute.name !== "style") remnant.removeAttribute(attribute.name);
    });
    remnant.className = "afisha__remnant";
    remnant.setAttribute("aria-hidden", "true");
    remnant.inert = true;
    remnant.querySelectorAll("[id]").forEach(element => element.removeAttribute("id"));
    remnant.querySelectorAll("img").forEach(image => { image.alt = ""; });
    remnant.style.transform = pose.matrix.toString();
    remnant.style.opacity = String(pose.opacity);
    remnant.style.zIndex = pose.z;
    frame.append(remnant);
    const animation = remnant.animate([
      { transform: pose.matrix.toString(), opacity: pose.opacity },
      { transform: exit.toString(), opacity: 0 },
    ], { duration: duration * pose.opacity, easing, fill: "both" });
    remnants.set(remnant, animation);
    animation.onfinish = () => { remnants.delete(remnant); remnant.remove(); };
  }

  function stopMotion() {
    cancelAnimationFrame(motionFrame);
    motionFrame = 0;
    const previous = motion;
    motion = null;
    previous?.animations.forEach(animation => animation.cancel());
  }

  function visiblePart(matrix, size, width) {
    const center = matrix.e + size.width / 2;
    return clamp((Math.min(width / 2, center + size.width / 2)
      - Math.max(-width / 2, center - size.width / 2)) / size.width, 0, 1);
  }

  function progressMotion() {
    if (!motion || motion.returning) return;
    const active = motion;
    const progress = active.animations[0].effect.getComputedTiming().progress ?? 0;
    const departure = Math.min(progress / .55, 1);
    const incoming = Math.min(progress / .45, 1);
    const outgoingMatrix = mixMatrix(active.outgoing.matrix, active.exit, departure);
    const incomingMatrix = mixMatrix(active.incoming.matrix, active.destination, progress);
    const oldWeight = active.outgoing.opacity * (1 - departure)
      * visiblePart(outgoingMatrix, active.scene.sizes[active.from], active.scene.bounds.width);
    const newWeight = (active.incoming.opacity + (1 - active.incoming.opacity) * incoming)
      * visiblePart(incomingMatrix, active.scene.sizes[active.target], active.scene.bounds.width);
    if (!active.committed && oldWeight <= newWeight / (1 + newWeight)) {
      active.committed = true;
      select(active.target, active.method);
    }
    // The outgoing print is tucked below only while fully transparent.
    if (progress >= .55 && !active.layered) {
      active.layered = true;
      photos.forEach((photo, i) => { photo.style.zIndex = String(3 - positionOf(i, active.target)); });
    }
  }

  // Snapshot before cancelling WAAPI: a new input starts at the visible pose.
  // Geometry is measured here, once per input, never in pointermove/rAF.
  function captureScene(keepRemnant = true) {
    progressMotion();
    const retiring = keepRemnant && motion?.committed && !motion.returning && motion.from !== index
      ? { from: motion.from, exit: motion.exit } : null;
    const poses = photos.map(photo => {
      if (photo.hidden) return null;
      const style = getComputedStyle(photo);
      return { matrix: new DOMMatrix(style.transform), opacity: Number(style.opacity), z: style.zIndex };
    });
    const oldPose = retiring && poses[retiring.from];
    const retire = oldPose?.opacity > .01 && Number(oldPose.z) > Number(poses[index].z);
    if (retire) poses[retiring.from] = { ...oldPose, opacity: 0 };
    stopMotion();
    photos.forEach((photo, i) => {
      photo.hidden = false;
      photo.style.opacity = String(poses[i]?.opacity ?? 0);
      if (poses[i]) photo.style.transform = poses[i].matrix.toString();
      photo.style.zIndex = poses[i]?.z ?? "0";
    });
    const sizes = photos.map(photo => ({ width: photo.offsetWidth, height: photo.offsetHeight }));
    const bounds = frame.getBoundingClientRect();
    const tokens = getComputedStyle(frame);
    if (retire) retirePhoto(photos[retiring.from], oldPose, retiring.exit,
      parseFloat(tokens.getPropertyValue("--feedback-duration")), tokens.getPropertyValue("--ease-enter").trim());
    photos.forEach((photo, i) => {
      if (poses[i]) return;
      poses[i] = { matrix: restMatrix(sizes[i], 1), opacity: 0, z: "0" };
      photo.style.transform = poses[i].matrix.toString();
    });
    return { poses, sizes, bounds, duration: parseFloat(tokens.getPropertyValue("--reveal-duration")),
      feedback: parseFloat(tokens.getPropertyValue("--feedback-duration")),
      enter: tokens.getPropertyValue("--ease-enter").trim(), state: tokens.getPropertyValue("--ease-state").trim() };
  }

  function restMatrix(size, position) {
    return new DOMMatrix().translate(-size.width / 2, -size.height / 2).rotate(rotations[position] ?? -6);
  }

  function mixMatrix(from, to, progress) {
    return new DOMMatrix(["a", "b", "c", "d", "e", "f"].map(key => from[key] + (to[key] - from[key]) * progress));
  }

  function settle(scene, target = index, method = null, step = 1, instant = false) {
    const returning = target === index;
    const tokensReady = Number.isFinite(scene.duration) && Number.isFinite(scene.feedback) && scene.enter && scene.state;
    if (instant || reducedMotion.matches || !mobile.matches || document.hidden || !tokensReady) {
      clearRemnants();
      if (!returning || method) select(target, method);
      rest();
      return;
    }
    const from = index;
    const outgoing = scene.poses[from];
    const incoming = scene.poses[target];
    const direction = step > 0 ? -1 : 1;
    const distance = direction * Math.max(scene.bounds.width * .9,
      Math.abs(outgoing.matrix.e + scene.sizes[from].width / 2) + scene.bounds.width * .25);
    const exit = new DOMMatrix().translate(distance, 0)
      .multiply(restMatrix(scene.sizes[from], 0)).rotate(direction * 10);
    const destination = restMatrix(scene.sizes[target], 0);
    const active = { scene, from, target, method, returning, outgoing, incoming, exit, destination,
      committed: returning, animations: [] };
    motion = active;
    photos.forEach((photo, i) => {
      const position = positionOf(i, target);
      const visible = position < 3;
      if (visible) loadPhoto(photo);
      const pose = scene.poses[i];
      const finalMatrix = restMatrix(scene.sizes[i], position);
      const first = { transform: pose.matrix.toString(), opacity: pose.opacity };
      const last = { transform: finalMatrix.toString(), opacity: visible ? 1 : 0 };
      let keyframes = [first, last];
      if (!returning && i === from) {
        const departed = { transform: exit.toString(), opacity: 0, offset: .55 };
        keyframes = visible
          ? [first, departed, { ...last, opacity: 0, offset: .551 }, last]
          : [first, departed, { ...departed, offset: 1 }];
        photo.style.zIndex = "4";
      } else if (!returning && i === target) {
        photo.style.zIndex = "3";
        keyframes = [first, { transform: mixMatrix(pose.matrix, finalMatrix, .45).toString(), opacity: 1, offset: .45 }, last];
      } else {
        photo.style.zIndex = String(Math.max(0, 2 - position));
      }
      active.animations.push(photo.animate(keyframes, {
        duration: returning ? scene.feedback : scene.duration,
        easing: returning ? scene.enter : scene.state, fill: "both",
      }));
    });
    const finish = () => {
      if (motion !== active) return;
      if (!active.committed) select(target, method);
      stopMotion();
      rest();
    };
    active.animations[0].onfinish = finish;
    const tick = () => {
      if (motion !== active) return;
      progressMotion();
      motionFrame = requestAnimationFrame(tick);
    };
    progressMotion();
    motionFrame = requestAnimationFrame(tick);
  }

  telegram.addEventListener("click", async event => {
    if (!copyBeforeTelegram.matches || (copyUI && !copyUI.manualCopy.hidden)) return;
    event.preventDefault();
    if (copying) return;
    if (!copyUI) {
      const manualCopy = document.createElement("label");
      manualCopy.className = "afisha__order-draft";
      manualCopy.hidden = true;
      const caption = document.createElement("span");
      caption.textContent = "Текст для сообщения";
      const field = document.createElement("textarea");
      field.readOnly = true;
      field.rows = 6;
      manualCopy.append(caption, field);
      const status = document.createElement("p");
      status.className = "afisha__order-status";
      status.setAttribute("role", "status");
      order.append(manualCopy, status);
      copyUI = { manualCopy, field, status };
    }
    const version = selectionVersion;
    const destination = telegram.href;
    copying = true;
    const copied = await copyOrderMessage(new URL(destination).searchParams.get("text"), copyUI);
    if (version !== selectionVersion) {
      copyUI.manualCopy.hidden = true;
      copyUI.status.textContent = "";
      return;
    }
    copying = false;
    if (!copied) {
      telegram.textContent = "Открыть чат в\u00a0Телеграме";
      return;
    }
    const afisha = gallery.closest(".afisha");
    document.dispatchEvent(new CustomEvent("shop:goal", { detail: { goal: "order_click", params: {
      channel: "telegram", context: "afisha", source: "afisha",
      product: afisha.dataset.productName, product_id: afisha.dataset.productId,
    } } }));
    window.location.assign(destination);
  });

  function releaseGesture() {
    const previous = gesture;
    gesture = null;
    cancelAnimationFrame(dragFrame);
    dragFrame = 0;
    delete frame.dataset.dragging;
    if (previous && frame.hasPointerCapture(previous.id)) frame.releasePointerCapture(previous.id);
    return previous;
  }

  function move(step, method, instant = false) {
    if (!mobile.matches) return;
    const target = wrap((motion?.target ?? index) + step);
    releaseGesture();
    settle(captureScene(!instant && !reducedMotion.matches), target, method, step, instant);
  }

  function drawDrag() {
    dragFrame = 0;
    const current = gesture;
    if (!current?.dragging) return;
    const { scene, dx, dy, gripX, gripY, gripHeight } = current;
    const reduced = reducedMotion.matches;
    const x = reduced ? clamp(dx * .15, -16, 16) : dx;
    const y = reduced ? clamp(dy * .1, -4, 4) : clamp(dy * .28, -20, 20);
    const tilt = reduced ? 0 : clamp(-gripHeight / (scene.sizes[index].height / 2)
      * dx / scene.bounds.width * 18, -12, 12);
    const transform = new DOMMatrix().translate(x, y).translate(gripX, gripY)
      .rotate(tilt).translate(-gripX, -gripY).multiply(scene.poses[index].matrix);
    photos[index].style.transform = transform.toString();
    photos[index].style.zIndex = "4";
    if (reduced) return;
    const step = dx < 0 ? 1 : -1;
    const next = wrap(index + step);
    const progress = clamp(Math.abs(dx) / (scene.bounds.width * .55), 0, 1);
    photos.forEach((photo, i) => {
      if (i === index) return;
      const pose = scene.poses[i];
      const isIncoming = i === next;
      const amount = isIncoming ? progress : Math.min(progress, .35);
      const destination = restMatrix(scene.sizes[i], isIncoming ? 0 : positionOf(i));
      photo.style.transform = mixMatrix(pose.matrix, destination, amount).toString();
      photo.style.opacity = String(isIncoming ? pose.opacity + (1 - pose.opacity) * Math.min(progress * 3, 1) : pose.opacity);
      photo.style.zIndex = isIncoming ? "3" : String(Math.max(0, 2 - positionOf(i)));
    });
  }

  function recordPointer(event) {
    const current = gesture;
    const time = performance.now();
    current.dx = event.clientX - current.x;
    current.dy = event.clientY - current.y;
    current.samples = current.samples.filter(sample => time - sample.time < 80);
    current.samples.push({ x: event.clientX, time });
  }

  function cancelGesture(instant = false) {
    const current = releaseGesture();
    if (!current) return;
    const scene = captureScene();
    settle(scene, current.resume?.target ?? index, current.resume?.method,
      current.resume?.step ?? 1, instant);
  }

  change.addEventListener("click", event => move(1, "button", event.detail === 0));
  frame.addEventListener("keydown", event => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    move(event.key === "ArrowLeft" ? -1 : 1, "keyboard", true);
  });
  frame.addEventListener("pointerdown", event => {
    if (!mobile.matches || !event.isPrimary || event.button !== 0) return;
    blockClick = false;
    releaseGesture();
    const resume = motion && !motion.returning
      ? { target: motion.target, method: motion.committed ? null : motion.method, step: motion.target === wrap(index - 1) ? -1 : 1 } : null;
    const scene = captureScene();
    loadPhoto(photos[wrap(index - 1)]);
    loadPhoto(photos[wrap(index + 1)]);
    const originX = scene.bounds.left + scene.bounds.width / 2 + scene.sizes[index].width / 2;
    const originY = scene.bounds.top + scene.bounds.height / 2 + scene.sizes[index].height / 2;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, dx: 0, dy: 0,
      gripX: event.clientX - originX, gripY: event.clientY - originY,
      gripHeight: event.clientY - scene.bounds.top - scene.bounds.height / 2,
      scene, resume, dragging: false, samples: [{ x: event.clientX, time: performance.now() }] };
  });
  frame.addEventListener("pointermove", event => {
    if (!gesture || gesture.id !== event.pointerId) return;
    recordPointer(event);
    if (!gesture.dragging) {
      const x = Math.abs(gesture.dx);
      const y = Math.abs(gesture.dy);
      if (y > 10 && y >= x) { blockClick = true; cancelGesture(); return; }
      if (x < 10 || x < y * 1.15) return;
      gesture.dragging = true;
      blockClick = true;
      frame.dataset.dragging = "true";
      try { frame.setPointerCapture(event.pointerId); } catch { /* A synthetic pointer need not be active. */ }
    }
    event.preventDefault();
    if (!dragFrame) dragFrame = requestAnimationFrame(drawDrag);
  }, { passive: false });
  frame.addEventListener("pointerup", event => {
    if (!gesture || gesture.id !== event.pointerId) return;
    recordPointer(event);
    if (!gesture.dragging) {
      if (Math.hypot(gesture.dx, gesture.dy) > 10) blockClick = true;
      cancelGesture();
      return;
    }
    event.preventDefault();
    drawDrag();
    const current = releaseGesture();
    const first = current.samples[0];
    const last = current.samples.at(-1);
    const speed = (last.x - first.x) / Math.max(1, last.time - first.time);
    const flick = Math.abs(speed) > .55 && Math.abs(last.x - first.x) >= 18;
    const accepted = Math.abs(current.dx) >= current.scene.bounds.width * .22 || flick;
    const step = (flick ? speed : current.dx) < 0 ? 1 : -1;
    const scene = captureScene();
    if (accepted) settle(scene, wrap(index + step), "swipe", step);
    else settle(scene);
  });
  frame.addEventListener("pointercancel", event => { if (gesture?.id === event.pointerId) cancelGesture(); });
  frame.addEventListener("lostpointercapture", event => { if (gesture?.id === event.pointerId) cancelGesture(); });
  frame.addEventListener("dragstart", event => {
    if (event.target === frame || event.target.closest(".afisha__print")) event.preventDefault();
  });
  frame.addEventListener("click", event => {
    if (!blockClick || event.detail === 0) return;
    event.preventDefault();
    blockClick = false;
  });
  document.addEventListener("pointerdown", event => {
    if (gesture && event.pointerId !== gesture.id) cancelGesture();
  }, { capture: true, passive: true });
  document.addEventListener("pointerup", event => {
    if (gesture?.id === event.pointerId && !frame.contains(event.target)) cancelGesture();
  }, { capture: true, passive: true });

  function resetTransient() {
    const target = gesture?.resume?.target ?? motion?.target ?? index;
    const method = gesture?.resume?.method ?? (motion && !motion.committed ? motion.method : null);
    releaseGesture();
    stopMotion();
    clearRemnants();
    if (target !== index) select(target, method);
    rest();
  }
  mobile.addEventListener("change", () => {
    resetTransient();
    if (mobile.matches) { select(index); rest(); }
  });
  reducedMotion.addEventListener("change", resetTransient);
  window.addEventListener("resize", resetTransient, { passive: true });
  window.addEventListener("blur", resetTransient);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) resetTransient();
  });
  if (mobile.matches) { select(index); rest(); }
}
