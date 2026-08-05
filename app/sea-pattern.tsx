type SeaPatternProps = {
  id: string;
  tone?: "paper" | "blue";
  variant?: "default" | "purchase";
};

const fieldWidth = 1428;
const fieldHeight = 1350;
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

function makePurchaseMarksPath() {
  const marks: string[] = [];
  const columnCount = fieldWidth / step;

  for (let column = 0; column < columnCount; column += 1) {
    const topX = column * step + step / 2;
    const bottomX = column * step;
    const topEnd =
      150 +
      42 * Math.sin((topX / fieldWidth) * Math.PI * 4 + 0.35) +
      18 * Math.sin((topX / fieldWidth) * Math.PI * 10 + 1.2);
    const bottomStart =
      480 +
      34 * Math.sin((bottomX / fieldWidth) * Math.PI * 6 + 1.45) +
      14 * Math.sin((bottomX / fieldWidth) * Math.PI * 12 + 0.2);

    marks.push(
      `M${(topX - markHalfWidth).toFixed(1)} 0` +
        `H${(topX + markHalfWidth).toFixed(1)}` +
        `L${topX.toFixed(1)} ${topEnd.toFixed(1)}Z`,
      `M${(bottomX - markHalfWidth).toFixed(1)} ${bottomStart.toFixed(1)}` +
        `H${(bottomX + markHalfWidth).toFixed(1)}` +
        `L${bottomX.toFixed(1)} ${purchaseBandHeight.toFixed(1)}Z`,
    );
  }

  return marks.join("");
}

const marksPath = makeMarksPath();
const purchaseMarksPath = makePurchaseMarksPath();

export function SeaPattern({
  id,
  tone = "paper",
  variant = "default",
}: SeaPatternProps) {
  const fieldId = `sea-pattern-field-${id}`;
  const patternPath = variant === "purchase" ? purchaseMarksPath : marksPath;
  const patternHeight = variant === "purchase" ? purchaseBandHeight : fieldHeight;

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
          height={patternHeight}
          patternUnits="userSpaceOnUse"
        >
          <path className="sea-pattern__mark" d={patternPath} />
        </pattern>
      </defs>

      <rect width="100%" height="100%" fill={`url(#${fieldId})`} />
    </svg>
  );
}
