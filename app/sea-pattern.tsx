type SeaPatternProps = {
  id: string;
  tone?: "paper" | "blue";
  variant?: "default" | "purchase";
};

const fieldWidth = 1428;
const purchaseFieldWidth = fieldWidth * 2;
const fieldHeight = 1350;
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

function makeMarksPath(variant: "default" | "purchase" = "default") {
  const marks: string[] = [];
  const patternWidth = variant === "purchase" ? purchaseFieldWidth : fieldWidth;
  const columnCount = patternWidth / step;

  for (let row = 0; row < rowCount; row += 1) {
    const phaseShift = row % 2 === 0 ? step / 2 : 0;

    for (let column = 0; column < columnCount; column += 1) {
      const x = column * step + phaseShift;
      const clearsHeader =
        variant === "purchase" && (row === 1 || row === 2);
      const stepsEdge = 660 + Math.sin(row * 1.7) * 42;
      const clearsSteps =
        variant === "purchase" && row >= 3 && row <= 8 && x > stepsEdge;

      if (clearsHeader || clearsSteps) continue;

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

const marksPath = makeMarksPath();
const purchaseMarksPath = makeMarksPath("purchase");

export function SeaPattern({
  id,
  tone = "paper",
  variant = "default",
}: SeaPatternProps) {
  const fieldId = `sea-pattern-field-${id}`;
  const patternPath = variant === "purchase" ? purchaseMarksPath : marksPath;
  const patternWidth = variant === "purchase" ? purchaseFieldWidth : fieldWidth;
  const patternHeight = variant === "purchase" ? 2200 : fieldHeight;

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
          width={patternWidth}
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
