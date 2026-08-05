type SeaPatternProps = {
  id: string;
  tone?: "paper" | "blue";
  variant?: "default" | "purchase";
};

const fieldWidth = 1428;
const fieldHeight = 1350;
const purchaseFieldWidth = 1000;
const purchaseBandHeight = 620;
const step = 42;
const rowCount = 9;
const gap = 12;
const markHalfWidth = 3.2;
const amplitudes = [42, 51, 36, 48, 54, 39, 50, 44] as const;
const cycles = [2, 3, 4, 2, 3, 4, 2, 3] as const;
const phases = [0.25, 1.4, 2.35, 0.9, 2.85, 1.65, 0.5, 2.2] as const;

function boundaryY(boundary: number, x: number) {
  if (boundary === 0) return 0;
  if (boundary === rowCount) return fieldHeight;

  const index = boundary - 1;
  const angle =
    (x / fieldWidth) * Math.PI * 2 * cycles[index] + phases[index];

  return boundary * (fieldHeight / rowCount) + amplitudes[index] * Math.sin(angle);
}

function makeMarksPath() {
  const marks: string[] = [];
  const columnCount = fieldWidth / step;

  for (let row = 0; row < rowCount; row += 1) {
    const phaseShift = row % 2 === 0 ? step / 2 : 0;

    for (let column = 0; column < columnCount; column += 1) {
      const x = column * step + phaseShift;
      const y1 = boundaryY(row, x) + gap / 2;
      const y2 = boundaryY(row + 1, x) - gap / 2;

      marks.push(
        `M${(x - markHalfWidth).toFixed(1)} ${y1.toFixed(1)}` +
          `H${(x + markHalfWidth).toFixed(1)}` +
          `L${x.toFixed(1)} ${y2.toFixed(1)}Z`,
      );
    }
  }

  return marks.join("");
}

function smoothWindow(
  x: number,
  left: number,
  right: number,
  feather: number,
) {
  if (x >= left && x <= right) return 1;
  if (x < left - feather || x > right + feather) return 0;

  const distance = x < left ? left - x : x - right;
  return (1 + Math.cos((distance / feather) * Math.PI)) / 2;
}

function makePurchaseMarksPath(layout: "desktop" | "mobile") {
  const marks: string[] = [];
  const columnCount = layout === "desktop" ? 30 : 18;
  const purchaseStep = purchaseFieldWidth / columnCount;
  const purchaseMarkHalfWidth = layout === "desktop" ? 2.4 : 4;

  for (let column = 0; column < columnCount; column += 1) {
    const topX = column * purchaseStep + purchaseStep / 2;
    const bottomX = column * purchaseStep;
    const topWave =
      270 +
      34 * Math.sin((topX / purchaseFieldWidth) * Math.PI * 4 + 0.35) +
      15 * Math.sin((topX / purchaseFieldWidth) * Math.PI * 10 + 1.2);
    const bottomWave =
      350 +
      30 * Math.sin((bottomX / purchaseFieldWidth) * Math.PI * 6 + 1.45) +
      12 * Math.sin((bottomX / purchaseFieldWidth) * Math.PI * 12 + 0.2);
    const titleIsland =
      layout === "desktop"
        ? smoothWindow(topX, 285, 825, 80)
        : smoothWindow(topX, 70, 700, 55);
    const titleIslandBottom =
      layout === "desktop"
        ? smoothWindow(bottomX, 285, 825, 80)
        : smoothWindow(bottomX, 70, 700, 55);
    const kickerIsland =
      layout === "desktop" ? smoothWindow(topX, 105, 210, 46) : 0;
    const kickerIslandBottom =
      layout === "desktop" ? smoothWindow(bottomX, 105, 210, 46) : 0;
    const topEnd = topWave - 120 * titleIsland - 12 * kickerIsland;
    const bottomStart =
      bottomWave + 120 * titleIslandBottom + 130 * kickerIslandBottom;

    marks.push(
      `M${(topX - purchaseMarkHalfWidth).toFixed(1)} 0` +
        `H${(topX + purchaseMarkHalfWidth).toFixed(1)}` +
        `L${topX.toFixed(1)} ${topEnd.toFixed(1)}Z`,
      `M${(bottomX - purchaseMarkHalfWidth).toFixed(1)} ${bottomStart.toFixed(1)}` +
        `H${(bottomX + purchaseMarkHalfWidth).toFixed(1)}` +
        `L${bottomX.toFixed(1)} ${purchaseBandHeight.toFixed(1)}Z`,
    );
  }

  return marks.join("");
}

const marksPath = makeMarksPath();
const purchaseDesktopMarksPath = makePurchaseMarksPath("desktop");
const purchaseMobileMarksPath = makePurchaseMarksPath("mobile");

export function SeaPattern({
  id,
  tone = "paper",
  variant = "default",
}: SeaPatternProps) {
  if (variant === "purchase") {
    return (
      <svg
        className={`sea-pattern sea-pattern--${tone}`}
        width="100%"
        height="100%"
        viewBox={`0 0 ${purchaseFieldWidth} ${purchaseBandHeight}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <path
          className="sea-pattern__mark sea-pattern__mark--purchase-desktop"
          d={purchaseDesktopMarksPath}
        />
        <path
          className="sea-pattern__mark sea-pattern__mark--purchase-mobile"
          d={purchaseMobileMarksPath}
        />
      </svg>
    );
  }

  const fieldId = `sea-pattern-field-${id}`;

  return (
    <svg
      className={`sea-pattern sea-pattern--${tone}`}
      width="100%"
      height="100%"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <pattern
          id={fieldId}
          width={fieldWidth}
          height={fieldHeight}
          patternUnits="userSpaceOnUse"
        >
          <path className="sea-pattern__mark" d={marksPath} />
        </pattern>
      </defs>

      <rect width="100%" height="100%" fill={`url(#${fieldId})`} />
    </svg>
  );
}
