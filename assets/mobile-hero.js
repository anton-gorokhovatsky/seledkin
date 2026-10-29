import { copyOrderMessage } from "./order-message.js";

// One opaque paper deck: a visible card changes layer only outside the scene.
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
  const mobile = matchMedia("(max-width: 61.1875rem)");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const wrap = value => (value + photos.length) % photos.length;
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  const smooth = value => { const t = clamp(value, 0, 1); return t * t * (3 - 2 * t); };
  const inverseSmooth = value => {
    if (value <= 0) return 0;
    let low = 0, high = 1;
    for (let i = 0; i < 18; i++) {
      const middle = (low + high) / 2;
      if (smooth(middle) < value) low = middle;
      else high = middle;
    }
    return (low + high) / 2;
  };
  const keys = ["x", "y", "angle", "scale"];
  const pose = (x = 0, y = 0, angle = -2, scale = 1) => ({ x, y, angle, scale });
  const still = () => ({ x: 0, y: 0, angle: 0, scale: 0 });
  const mix = (a, b, t) => Object.fromEntries(keys.map(key => [key, a[key] + (b[key] - a[key]) * t]));
  const slots = base => [base, wrap(base - 1), wrap(base + 1), wrap(base + 2), wrap(base + 3)];
  const positionOf = (id, base = index) => wrap(id - base);
  const cards = photos.map((element, id) => ({ id, element, size: { width: 0, height: 0 },
    pose: pose(), velocity: still(), goal: pose(), layer: 5 - id, hidden: true, route: null, cover: null, coverPending: null, time: 0 }));
  let copyUI;
  let copying = false;
  let selectionVersion = 0;
  let index = 0;
  let scene = null;
  let gesture = null;
  let operation = null;
  let coupling = null;
  let desiredOrder = slots(0);
  let orderApplied = true;
  let frameRequest = 0;
  let previousFrame = 0;
  let blockClick = false;
  let viewportWidth = innerWidth;

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


  function measure() {
    const hidden = cards.filter(card => card.element.hidden);
    hidden.forEach(card => { card.element.style.visibility = "hidden"; card.element.hidden = false; });
    cards.forEach(card => { card.size = { width: card.element.offsetWidth, height: card.element.offsetHeight }; });
    const bounds = frame.getBoundingClientRect();
    const tokens = getComputedStyle(frame);
    scene = { bounds, width: bounds.width, height: bounds.height,
      feedback: parseFloat(tokens.getPropertyValue("--feedback-duration")) / 1000,
      reveal: parseFloat(tokens.getPropertyValue("--reveal-duration")) / 1000,
      clip: parseFloat(getComputedStyle(document.documentElement).fontSize) * .25 };
    hidden.forEach(card => { card.element.hidden = true; card.element.style.removeProperty("visibility"); });
  }

  function render(card) {
    const p = card.pose;
    card.element.hidden = card.hidden;
    card.element.style.transform = `translate(-50%, -50%) translate3d(${p.x}px, ${p.y}px, 0) rotate(${p.angle}deg) scale(${p.scale})`;
    card.element.style.zIndex = String(Math.round(card.layer * 1000));
  }

  function corners(card, p = card.pose) {
    const angle = p.angle * Math.PI / 180;
    const c = Math.cos(angle) * p.scale;
    const s = Math.sin(angle) * p.scale;
    return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => {
      const px = x * card.size.width / 2;
      const py = y * card.size.height / 2;
      return { x: p.x + px * c - py * s, y: p.y + px * s + py * c };
    });
  }

  function contains(card, point, margin = 0) {
    if (card.hidden) return false;
    const p = card.pose;
    const angle = -p.angle * Math.PI / 180;
    const x = (point.x - p.x) / p.scale;
    const y = (point.y - p.y) / p.scale;
    return Math.abs(x * Math.cos(angle) - y * Math.sin(angle)) <= card.size.width / 2 - margin
      && Math.abs(x * Math.sin(angle) + y * Math.cos(angle)) <= card.size.height / 2 - margin;
  }

  function outside(card) {
    if (card.hidden) return true;
    const q = corners(card);
    const x = scene.width / 2 + scene.clip;
    const y = scene.height / 2 + scene.clip;
    return q.every(p => p.x < -x) || q.every(p => p.x > x)
      || q.every(p => p.y < -y) || q.every(p => p.y > y);
  }

  function covered(card) {
    return cards.some(cover => cover !== card && !cover.hidden && cover.layer > card.layer
      && corners(card).every(point => contains(cover, point, 2)));
  }

  function syncPhase() {
    frame.dataset.phase = gesture ? gesture.dragging ? "dragging" : "held"
      : operation ? cards.some(card => card.route) ? "departing" : "settling" : "rest";
    if (operation) frame.dataset.settling = "true";
    else delete frame.dataset.settling;
    if (gesture?.dragging) frame.dataset.dragging = "true";
    else delete frame.dataset.dragging;
  }

  function overlaps(a, b) {
    const qa = corners(a), qb = corners(b);
    return ![qa, qb].some(q => q.some((p, i) => {
      const next = q[(i + 1) % 4];
      const axis = { x: -(next.y - p.y), y: next.x - p.x };
      const pa = qa.map(point => point.x * axis.x + point.y * axis.y);
      const pb = qb.map(point => point.x * axis.x + point.y * axis.y);
      return Math.max(...pa) < Math.min(...pb) || Math.max(...pb) < Math.min(...pa);
    }));
  }

  function off(card, side, angle = card.pose.angle) {
    return pose(side * (scene.width / 2 + Math.hypot(card.size.width, card.size.height) / 2 + scene.clip + 16),
      0, angle, 1);
  }

  function coverPose(card, owner, ownerPose = owner.pose) {
    const scale = Math.min((owner.size.width - 8) / card.size.width,
      (owner.size.height - 8) / card.size.height, 1) * ownerPose.scale;
    return pose(ownerPose.x, ownerPose.y, ownerPose.angle, scale);
  }

  function deckGoals(base) {
    const [a, p, b, c, d] = slots(base).map(id => cards[id]);
    const goals = [];
    goals[a.id] = pose();
    goals[p.id] = off(p, -1, -2);
    goals[b.id] = pose(0, 0, 4);
    goals[c.id] = pose(0, 0, -6);
    goals[d.id] = coverPose(d, c, goals[c.id]);
    return goals;
  }

  function setRest(base, method = null) {
    cancelAnimationFrame(frameRequest);
    frameRequest = 0;
    previousFrame = 0;
    operation = null;
    coupling = null;
    const goals = deckGoals(base);
    desiredOrder = slots(base);
    orderApplied = true;
    cards.forEach(card => {
      card.pose = { ...goals[card.id] };
      card.goal = { ...card.pose };
      card.velocity = still();
      card.time = performance.now();
      card.layer = 5 - desiredOrder.indexOf(card.id);
      card.route = null;
      card.cover = null;
      card.coverPending = null;
      card.hidden = positionOf(card.id, base) > 2;
      card.element.style.removeProperty("opacity");
      render(card);
    });
    if (index !== base || method) select(base, method);
    syncPhase();
  }

  function reveal(card, at, layer) {
    if (!card.hidden) return;
    card.pose = { ...at };
    card.goal = { ...at };
    card.velocity = still();
    card.layer = layer;
    card.hidden = false;
    render(card);
  }

  function prepare(base) {
    const [a, p, b, c, d] = slots(base).map(id => cards[id]);
    stagePrevious(base);
    reveal(p, off(p, -1, -2), a.layer - .2);
    reveal(b, coverPose(b, a), a.layer - .4);
    reveal(c, coverPose(c, b), b.layer - .2);
    reveal(d, coverPose(d, c), c.layer - .2);
    if (outside(d) || covered(d)) {
      d.pose = coverPose(d, c);
      d.goal = { ...d.pose };
      d.velocity = still();
      d.layer = c.layer - .2;
      d.hidden = false;
    }
    photos.forEach(loadPhoto);
  }

  function normalizeLayers() {
    [...cards].sort((a, b) => b.layer - a.layer || b.id - a.id)
      .forEach((card, rank) => { card.layer = 5 - rank; });
  }

  function requestOrder(base, side) {
    desiredOrder = slots(base);
    orderApplied = false;
    const top = cards[base];
    cards.forEach(card => {
      const rank = desiredOrder.indexOf(card.id);
      const mustPass = card !== top && card.layer > top.layer && rank > 0 && !outside(card);
      if (mustPass && card.id !== gesture?.held) {
        const direction = positionOf(card.id, base) === photos.length - 1 ? -1 : card.route?.side ?? side;
        card.route = { side: direction, exit: off(card, direction, card.pose.angle + direction * 6) };
      } else card.route = null;
    });
  }

  function orderIfSafe() {
    if (coupling?.phase === "departing" && operation?.target === coupling.follower
      && outside(cards[coupling.driver]) && Math.abs(cards[coupling.follower].pose.x) > .12) return false;
    if (cards.some(card => card.route && !outside(card))) return false;
    const current = [...cards].sort((a, b) => b.layer - a.layer || b.id - a.id);
    for (let a = 0; a < current.length; a++) {
      for (let b = a + 1; b < current.length; b++) {
        const first = current[a], second = current[b];
        if (desiredOrder.indexOf(first.id) < desiredOrder.indexOf(second.id)) continue;
        if (!outside(first) && !outside(second) && overlaps(first, second)) {
          if (first.id !== gesture?.held && !first.route) {
            const side = first.pose.x < 0 ? -1 : 1;
            first.route = { side, exit: off(first, side, first.pose.angle + side * 6) };
          }
          return false;
        }
      }
    }
    cards.forEach(card => { card.layer = 5 - desiredOrder.indexOf(card.id); card.route = null; });
    orderApplied = true;
    return true;
  }

  function stagePrevious(base) {
    const previous = cards[wrap(base - 1)];
    if (!outside(previous) && !covered(previous)) return;
    previous.pose = off(previous, -1, -2);
    previous.goal = { ...previous.pose };
    previous.velocity = still();
    previous.cover = null;
    previous.layer = cards[base].layer - .2;
    previous.hidden = false;
  }

  function stageFar(base) {
    const far = cards[wrap(base + 3)];
    const owner = cards[wrap(base + 2)];
    if (!outside(far) && !covered(far)) return;
    // Both ends are invisible: off-clip/covered -> wholly inside an opaque owner.
    // A spare paper never flies into the scene on a stale foreground layer.
    far.pose = coverPose(far, owner);
    far.goal = { ...far.pose };
    far.velocity = { ...owner.velocity, scale: owner.velocity.scale * far.pose.scale / owner.pose.scale };
    far.layer = Math.min(...cards.filter(card => card !== far).map(card => card.layer)) - 1;
    far.cover = owner.id;
    far.coverPending = null;
    far.route = null;
    far.hidden = false;
  }

  function spring(card, target, dt, omega, skipX = false) {
    let moving = false;
    keys.forEach(key => {
      if (skipX && key === "x") return;
      const distance = card.pose[key] - target[key];
      const velocity = card.velocity[key];
      // Preserve velocity while braking a fast arriving paper before its target.
      // The critical solution stays monotone when v + omega * distance has the
      // same sign as distance; this also prevents a fast previous card overshoot.
      const damping = distance * velocity < 0 ? Math.max(omega, Math.abs(velocity / distance)) : omega;
      const tangent = velocity + damping * distance;
      const decay = Math.exp(-damping * dt);
      const next = target[key] + (distance + tangent * dt) * decay;
      const speed = (velocity - damping * tangent * dt) * decay;
      const epsilon = key === "scale" ? .0003 : key === "angle" ? .03 : .12;
      if (Math.abs(next - target[key]) < epsilon && Math.abs(speed) < epsilon * 20) {
        card.pose[key] = target[key]; card.velocity[key] = 0;
      } else {
        card.pose[key] = next; card.velocity[key] = speed; moving = true;
      }
    });
    return moving;
  }

  function hermite(left, right, coordinate) {
    const length = right.q - left.q;
    const t = clamp((coordinate - left.q) / length, 0, 1);
    const t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * left.x + (t3 - 2 * t2 + t) * length * left.tangent
      + (-2 * t3 + 3 * t2) * right.x + (t3 - t2) * length * right.tangent;
  }

  function sampleCoupling(link, coordinate) {
    const path = link.path;
    if (coordinate <= path[0].q) return path[0].x;
    for (let i = 1; i < path.length; i++) {
      if (coordinate <= path[i].q) return hermite(path[i - 1], path[i], coordinate);
    }
    return path.at(-1).x;
  }

  function coupledX(link, driverX) {
    return sampleCoupling(link, link.direction * driverX);
  }

  function coupledTangent(link, driverX) {
    return (coupledX(link, driverX + .01) - coupledX(link, driverX - .01)) / .02;
  }

  function pointerSpeed(current) {
    const first = current.samples[0], last = current.samples.at(-1);
    const duration = Math.max(1, last.time - first.time) / 1000;
    return { x: (last.x - first.x) / duration, y: (last.y - first.y) / duration,
      distance: last.x - first.x };
  }

  function makeCoupling(current, direction) {
    const driver = cards[current.held];
    const follower = cards[wrap(driver.id + (direction > 0 ? -1 : 1))];
    const coordinate = direction * driver.pose.x;
    const speed = pointerSpeed(current);
    const now = heldPose(current, current.dx, current.dy);
    const ahead = heldPose(current, current.dx + speed.x * .001, current.dy + speed.y * .001);
    const coordinateSpeed = direction * (ahead.x - now.x) / .001;
    const tangent = Math.abs(coordinateSpeed) > 1 ? follower.velocity.x / coordinateSpeed : 0;
    const cover = Math.max(1, driver.size.width * driver.pose.scale / 2 - scene.clip);
    const innerHalf = Math.max(1, follower.size.width / 2 - scene.clip * 2);
    const coveredX = Math.sign(follower.pose.x) * Math.min(Math.abs(follower.pose.x), innerHalf);
    let end = Math.max(scene.width / 2 + driver.size.width / 2 + scene.clip, coordinate + scene.clip);
    if (coordinate >= cover && follower.pose.x * tangent > 0 && Math.abs(follower.pose.x) < innerHalf) {
      end = Math.min(end, coordinate + 6 * (innerHalf - Math.abs(follower.pose.x)) / Math.abs(tangent));
    }
    end = Math.max(end, coordinate + .01);
    const home = direction > 0 ? off(follower, -1, -2).x
      : follower.layer > driver.layer && !outside(follower) ? off(follower, follower.pose.x < 0 ? -1 : 1).x : 0;
    const points = [{ q: coordinate, x: follower.pose.x, tangent }, { q: end, x: 0, tangent: 0 }];
    if (Math.abs(coordinate) > .01) points.push({ q: 0, x: home, tangent: 0 });
    if (Math.abs(coordinate - cover) > .01 && cover < end) {
      points.push({ q: cover, x: coveredX, tangent: -coveredX / (end - cover) });
    }
    points.sort((a, b) => a.q - b.q);
    return { driver: driver.id, follower: follower.id, direction, path: points,
      phase: "departing", mode: "forward", home };
  }

  function restoreCoupling(link) {
    const driver = cards[link.driver], follower = cards[link.follower];
    const coordinate = link.direction * driver.pose.x;
    if (Math.abs(coordinate) < .01) {
      link.phase = "returning";
      return;
    }
    const targetX = follower.route?.exit.x ?? follower.goal.x;
    const tangent = coupledTangent(link, driver.pose.x) / link.direction;
    link.path = [{ q: coordinate, x: follower.pose.x, tangent }, { q: 0, x: targetX, tangent: 0 }]
      .sort((a, b) => a.q - b.q);
    link.mode = "restore";
    link.restoreX = targetX;
  }

  function syncCoupling(time) {
    if (coupling?.phase !== "departing") return;
    const driver = cards[coupling.driver], follower = cards[coupling.follower];
    if (gesture?.held === follower.id) return;
    follower.pose.x = coupledX(coupling, driver.pose.x);
    follower.velocity.x = coupledTangent(coupling, driver.pose.x) * driver.velocity.x;
    follower.time = time;
  }

  function settled(card) {
    return keys.every(key => {
      const epsilon = key === "scale" ? .0003 : key === "angle" ? .03 : .12;
      return Math.abs(card.pose[key] - card.goal[key]) <= epsilon && Math.abs(card.velocity[key]) <= epsilon * 20;
    });
  }

  function dominant() {
    // Opaque paint ownership, sampled in the measured clip. No DOM/layout reads.
    const ordered = [...cards].filter(card => !card.hidden).sort((a, b) => b.layer - a.layer || b.id - a.id);
    const totals = cards.map(() => 0);
    const width = scene.width + scene.clip * 2;
    const height = scene.height + scene.clip * 2;
    for (let y = 0; y < 12; y++) for (let x = 0; x < 16; x++) {
      const point = { x: -width / 2 + (x + .5) * width / 16, y: -height / 2 + (y + .5) * height / 12 };
      const card = ordered.find(card => contains(card, point));
      if (card) totals[card.id]++;
    }
    const best = totals.indexOf(Math.max(...totals));
    if (best !== index && totals[best] > totals[index] * 1.08 + 2) select(best);
    if (operation?.accepted && !operation.announced && index === operation.target) {
      operation.announced = true;
      select(index, operation.method);
    }
  }

  function tick(time) {
    frameRequest = 0;
    previousFrame = time;
    let moving = false;
    const duration = gesture?.dragging ? scene.feedback : scene.reveal;
    // WebKit can start the module before the stylesheet supplies motion tokens.
    // Keep the current opaque poses; release can make a valid instant selection.
    if (!Number.isFinite(duration) || duration <= 0) {
      previousFrame = 0;
      return;
    }
    const omega = 7.5 / duration;
    if (gesture?.dragging) updateDragGoals(time);
    cards.forEach(card => {
      if (card.id === gesture?.held) return;
      if (gesture?.dragging && card.id === wrap(gesture.held - 1)) return;
      if (card.cover != null) return;
      if (card.hidden) return;
      const dt = Math.max(0, (time - card.time) / 1000);
      const pairedX = coupling?.phase === "departing" && (card.id === coupling.follower
        || (!gesture?.dragging && gesture?.held === coupling.follower
          && card.id === coupling.driver && cards[coupling.follower].pose.x < 0));
      moving = spring(card, card.route?.exit ?? card.goal, dt, omega, pairedX) || moving;
      card.time = time;
    });
    syncCoupling(time);
    cards.forEach(card => {
      if (card.coverPending != null) {
        const owner = cards[card.coverPending];
        if (owner.layer > card.layer && corners(card).every(point => contains(owner, point, 2))) {
          card.cover = card.coverPending;
          card.coverPending = null;
        }
      }
      if (card.cover == null || card.id === gesture?.held) return;
      const owner = cards[card.cover];
      card.pose = coverPose(card, owner);
      card.velocity = { ...owner.velocity, scale: owner.velocity.scale * card.pose.scale / owner.pose.scale };
      card.time = time;
    });
    if (operation) stageFar(operation.target);
    orderIfSafe();
    if (coupling?.phase === "departing" && operation?.target === coupling.follower
      && orderApplied && outside(cards[coupling.driver]) && Math.abs(cards[coupling.follower].pose.x) <= .12) {
      coupling.phase = "returning";
    }
    if (coupling?.phase === "departing" && coupling.mode === "restore" && orderApplied
      && Math.abs(cards[coupling.driver].pose.x) <= .12
      && Math.abs(cards[coupling.follower].pose.x - coupling.restoreX) <= .12) coupling.phase = "returning";
    syncPhase();
    cards.forEach(render);
    dominant();
    const allSettled = cards.every(settled);
    if (!gesture && operation && allSettled && orderApplied && !cards.some(card => card.route)
      && coupling?.phase !== "departing") {
      const completed = operation;
      setRest(completed.target, completed.accepted && !completed.announced ? completed.method : null);
      return;
    }
    if (moving || (!gesture && operation && (!orderApplied || !allSettled))) frameRequest = requestAnimationFrame(tick);
    else previousFrame = 0;
  }

  function wake() {
    if (!frameRequest) {
      if (!previousFrame) cards.forEach(card => { card.time = performance.now(); });
      frameRequest = requestAnimationFrame(tick);
    }
  }

  function finish(target, method = null, side = 1, accepted = false, instant = false, base = index, pair = null) {
    if (instant || reducedMotion.matches || !mobile.matches || document.hidden
      || !Number.isFinite(scene.reveal) || scene.reveal <= 0
      || !Number.isFinite(scene.feedback) || scene.feedback <= 0) {
      setRest(target, method);
      return;
    }
    if (coupling && target !== coupling.driver && target !== coupling.follower) coupling = null;
    stagePrevious(target);
    const goals = deckGoals(target);
    cards.forEach(card => { card.goal = { ...goals[card.id] }; card.cover = null; card.coverPending = null; });
    const far = cards[wrap(target + 3)];
    far.coverPending = wrap(target + 2);
    stageFar(target);
    operation = { base, target, side, method, accepted, announced: false,
      pair: pair ?? [base, target === base ? wrap(base + (side > 0 ? -1 : 1)) : target] };
    requestOrder(target, side);
    if (coupling?.phase === "departing" && target === coupling.driver) restoreCoupling(coupling);
    syncPhase();
    wake();
  }

  function hit(point) {
    if (!operation) return cards[index];
    const front = operation.pair.map(id => cards[id]);
    return front.filter(card => contains(card, point))
      .sort((a, b) => b.layer - a.layer || b.id - a.id)[0]
      ?? (operation.pair.includes(index) ? cards[index] : cards[operation.target]);
  }

  function heldPose(current, dx, dy) {
    const card = cards[current.held];
    const base = current.startPose;
    const limitedX = reducedMotion.matches ? clamp(dx * .15, -16, 16) : dx;
    const limitedY = reducedMotion.matches ? clamp(dy * .1, -4, 4) : clamp(dy * .28, -20, 20);
    const tilt = reducedMotion.matches ? 0 : clamp(-current.local.y / (card.size.height / 2)
      * dx / scene.width * 18, -12, 12);
    const angle = base.angle + tilt;
    const radians = angle * Math.PI / 180;
    const oldRadians = base.angle * Math.PI / 180;
    const local = current.local;
    return pose(base.x + limitedX + base.scale * ((Math.cos(oldRadians) - Math.cos(radians)) * local.x
      - (Math.sin(oldRadians) - Math.sin(radians)) * local.y),
    base.y + limitedY + base.scale * ((Math.sin(oldRadians) - Math.sin(radians)) * local.x
      + (Math.cos(oldRadians) - Math.cos(radians)) * local.y), angle, base.scale);
  }

  function previousPose(current, dx) {
    const previous = cards[wrap(current.held - 1)];
    const amount = reducedMotion.matches ? 0 : smooth(Math.abs(dx) / current.previousDistance);
    return mix(current.baseline[previous.id], dx >= 0 ? pose() : off(previous, -1, -2), amount);
  }

  function calibratePrevious(current) {
    const held = cards[current.held];
    const previous = cards[wrap(current.held - 1)];
    const travel = Math.max(0, -current.baseline[previous.id].x);
    const previousHalfWidth = previous.size.width / 2 - scene.clip;
    const required = travel ? clamp((travel - previousHalfWidth + scene.clip) / travel, 0, 1) : 0;
    // The arriving edge covers the centre before the held paper releases it.
    // A portrait's width, rather than the whole scene width, sets that deadline.
    const uncover = Math.max(1, held.size.width * current.startPose.scale / 2 - scene.clip);
    current.previousDistance = Math.min(scene.width * .5, uncover / inverseSmooth(required));
    current.coverProgress = required;
  }

  function updateDragGoals(time = performance.now()) {
    const current = gesture;
    if (!current?.dragging) return;
    if (current.link && current.link.phase !== "departing") {
      const held = cards[current.held];
      held.pose = heldPose(current, current.dx, current.dy);
      held.time = time;
      render(held);
      return;
    }
    let link = current.link?.phase === "departing" ? current.link : null;
    const direction = current.dx < 0 ? -1 : 1;
    if (link && !current.carries && link.direction !== direction && Math.abs(current.dx) >= 10) {
      prepare(current.held);
      current.baseline = cards.map(card => ({ ...card.pose }));
      coupling = makeCoupling(current, direction);
      current.link = coupling;
      link = coupling;
    }
    const [a, p, b, c, d] = slots(current.held).map(id => cards[id]);
    const held = cards[current.held];
    held.pose = heldPose(current, current.dx, current.dy);
    held.time = time;
    const displacement = current.dx;
    const amount = reducedMotion.matches ? 0 : smooth(Math.abs(displacement) / (scene.width * .5));
    const forward = displacement < 0;
    const goals = current.baseline.map(p => ({ ...p }));
    if (forward) {
      goals[p.id] = current.baseline[p.id];
      goals[b.id] = mix(current.baseline[b.id], pose(), amount);
      goals[c.id] = mix(current.baseline[c.id], pose(0, 0, 4), amount);
      goals[d.id] = mix(current.baseline[d.id], pose(0, 0, -6), amount);
      d.cover = null;
      d.coverPending = null;
    } else {
      goals[p.id] = mix(current.baseline[p.id], pose(), amount);
      goals[b.id] = mix(current.baseline[b.id], pose(0, 0, -6), amount);
      goals[c.id] = mix(current.baseline[c.id], coverPose(c, b, pose(0, 0, -6)), amount);
      d.coverPending = c.id;
    }
    cards.forEach(card => { if (card !== a) card.goal = goals[card.id]; });
    if (link) syncCoupling(time);
    else {
      p.pose = previousPose(current, current.dx);
      p.goal = { ...p.pose };
      p.time = time;
    }
    render(a);
    render(p);
    if (link) render(cards[link.follower]);
  }

  function record(event) {
    const time = performance.now();
    gesture.dx = event.clientX - gesture.x;
    gesture.dy = event.clientY - gesture.y;
    gesture.samples = gesture.samples.filter(sample => time - sample.time < 80);
    gesture.samples.push({ x: event.clientX, y: event.clientY, time });
  }

  function release() {
    const previous = gesture;
    gesture = null;
    if (previous) {
      cards[previous.held].time = performance.now();
      if (previous.dragging) cards[wrap(previous.held - 1)].time = performance.now();
    }
    syncPhase();
    if (previous && frame.hasPointerCapture(previous.id)) frame.releasePointerCapture(previous.id);
    return previous;
  }

  function releaseVelocity(current) {
    const first = current.samples[0], last = current.samples.at(-1);
    const duration = Math.max(1, last.time - first.time) / 1000;
    const x = (last.x - first.x) / duration;
    const y = (last.y - first.y) / duration;
    const now = heldPose(current, current.dx, current.dy);
    const ahead = heldPose(current, current.dx + x * .001, current.dy + y * .001);
    cards[current.held].velocity = Object.fromEntries(keys.map(key => [key, (ahead[key] - now[key]) / .001]));
    cards[current.held].time = performance.now();
    const previous = cards[wrap(current.held - 1)];
    if (current.link?.phase === "departing") {
      const link = current.link;
      const a = cards[link.driver], p = cards[link.follower];
      p.velocity.x = coupledTangent(link, a.pose.x) * a.velocity.x;
    } else if (!current.link) {
      const previousNow = previousPose(current, current.dx);
      const previousAhead = previousPose(current, current.dx + x * .001);
      previous.velocity = Object.fromEntries(keys.map(key => [key, (previousAhead[key] - previousNow[key]) / .001]));
      previous.time = performance.now();
    }
    return { x, y, distance: last.x - first.x };
  }

  function cancel(instant = false) {
    const current = gesture;
    if (!current) return;
    if (current.dragging) releaseVelocity(current);
    release();
    const target = current.resume?.target ?? (current.dragging ? current.held : current.origin);
    const announce = current.resume?.accepted && !current.resume.announced;
    const side = current.resume?.side ?? (current.dx < 0 ? -1 : 1);
    finish(target, announce ? current.resume.method : null, side,
      Boolean(announce), instant, current.resume?.base ?? current.held, current.resume?.pair);
  }

  function move(step, method, instant = false) {
    if (!mobile.matches) return;
    if (!scene) measure();
    const base = operation?.target ?? index;
    const target = wrap(base + step);
    if (gesture?.dragging) releaseVelocity(gesture);
    release();
    prepare(index);
    finish(target, method, step > 0 ? -1 : 1, true, instant, base);
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
    if (gesture) cancel(true);
    measure();
    const point = { x: event.clientX - scene.bounds.left - scene.width / 2,
      y: event.clientY - scene.bounds.top - scene.height / 2 };
    const held = hit(point);
    const radians = -held.pose.angle * Math.PI / 180;
    const dx = (point.x - held.pose.x) / held.pose.scale;
    const dy = (point.y - held.pose.y) / held.pose.scale;
    gesture = { id: event.pointerId, held: held.id, origin: index, x: event.clientX, y: event.clientY, dx: 0, dy: 0,
      startPose: { ...held.pose }, local: { x: dx * Math.cos(radians) - dy * Math.sin(radians),
        y: dx * Math.sin(radians) + dy * Math.cos(radians) },
      resume: operation ? { base: operation.base, target: operation.target, side: operation.side,
        accepted: operation.accepted, announced: operation.announced, method: operation.method, pair: operation.pair } : null,
      dragging: false, samples: [{ x: event.clientX, y: event.clientY, time: performance.now() }] };
    if (coupling?.phase === "departing" && coupling.driver === held.id) {
      gesture.link = coupling;
      gesture.carries = true;
    }
    syncPhase();
  });
  frame.addEventListener("pointermove", event => {
    if (!gesture || gesture.id !== event.pointerId) return;
    record(event);
    if (!gesture.dragging) {
      const x = Math.abs(gesture.dx), y = Math.abs(gesture.dy);
      if (y > 10 && y >= x) { blockClick = true; cancel(); return; }
      if (x < 10 || x < y * 1.15) return;
      normalizeLayers();
      prepare(gesture.held);
      gesture.baseline = cards.map(card => ({ ...card.pose }));
      calibratePrevious(gesture);
      if (!gesture.link) {
        coupling = makeCoupling(gesture, gesture.dx < 0 ? -1 : 1);
        gesture.link = coupling;
      }
      gesture.dragging = true;
      blockClick = true;
      if (!gesture.carries) {
        operation = null;
        requestOrder(gesture.held, gesture.dx < 0 ? -1 : 1);
      }
      syncPhase();
      try { frame.setPointerCapture(event.pointerId); } catch { /* Synthetic pointers can lack a native capture target. */ }
    }
    event.preventDefault();
    wake();
  }, { passive: false });
  frame.addEventListener("pointerup", event => {
    if (!gesture || gesture.id !== event.pointerId) return;
    record(event);
    if (!gesture.dragging) {
      if (Math.hypot(gesture.dx, gesture.dy) > 10) blockClick = true;
      cancel();
      return;
    }
    event.preventDefault();
    updateDragGoals();
    const speed = releaseVelocity(gesture);
    const current = release();
    const flick = Math.abs(speed.x) > 550 && Math.abs(speed.distance) >= 18;
    const accepted = Math.abs(current.dx) >= scene.width * .22 || flick;
    const step = (flick ? speed.x : current.dx) < 0 ? 1 : -1;
    let target = accepted ? wrap(current.held + step) : current.resume?.target ?? current.held;
    let side = step > 0 ? -1 : 1;
    const resumingOutgoing = current.resume && current.held === current.resume.base
      && current.resume.target !== current.held;
    if (resumingOutgoing) {
      const originalSide = current.resume.side;
      const outwardFlick = flick && originalSide * speed.x > 0;
      const inwardFlick = flick && originalSide * speed.x < 0;
      const atHome = Math.abs(cards[current.held].pose.x) < scene.width * .22;
      const restore = inwardFlick || (atHome && !outwardFlick);
      target = restore ? current.held : current.resume.target;
      side = restore ? -originalSide : originalSide;
    }
    if (current.link?.phase === "departing" && target !== current.held && target !== current.link.follower) {
      coupling = makeCoupling(current, side);
      current.link = coupling;
    }
    finish(target, accepted || resumingOutgoing ? "swipe" : null, side,
      accepted || resumingOutgoing, false, current.held, resumingOutgoing ? current.resume.pair : null);
  });
  frame.addEventListener("pointercancel", event => { if (gesture?.id === event.pointerId) cancel(); });
  frame.addEventListener("lostpointercapture", event => { if (gesture?.id === event.pointerId) cancel(); });
  frame.addEventListener("dragstart", event => event.preventDefault());
  frame.addEventListener("click", event => {
    if (!blockClick || event.detail === 0) return;
    event.preventDefault();
    blockClick = false;
  });
  document.addEventListener("pointerdown", event => {
    if (gesture && event.pointerId !== gesture.id) cancel();
  }, { capture: true, passive: true });
  document.addEventListener("pointerup", event => {
    if (gesture?.id === event.pointerId && !frame.contains(event.target)) cancel();
  }, { capture: true, passive: true });

  function reset() {
    const target = gesture ? gesture.resume?.target ?? (gesture.dragging ? gesture.held : gesture.origin)
      : operation?.target ?? index;
    const pending = gesture?.resume ?? operation;
    const method = pending?.accepted && !pending.announced && pending.target === target ? pending.method : null;
    release();
    cancelAnimationFrame(frameRequest);
    frameRequest = 0;
    previousFrame = 0;
    if (!mobile.matches) {
      operation = null;
      coupling = null;
      cards.forEach(card => { card.route = null; card.cover = null; card.coverPending = null; card.velocity = still(); });
      desiredOrder = slots(target);
      orderApplied = true;
      if (index !== target || method) select(target, method);
      syncPhase();
      return;
    }
    measure();
    setRest(target, method);
  }
  mobile.addEventListener("change", () => {
    reset();
    if (mobile.matches) { photos.forEach(loadPhoto); select(index); }
  });
  reducedMotion.addEventListener("change", reset);
  window.addEventListener("resize", () => {
    if (innerWidth === viewportWidth) return;
    viewportWidth = innerWidth;
    reset();
  }, { passive: true });
  window.addEventListener("blur", reset);
  document.addEventListener("visibilitychange", () => { if (document.hidden) reset(); });
  if (mobile.matches) {
    measure();
    setRest(0);
    photos.forEach(loadPhoto);
    select(0);
  }
}
