type SeaPatternProps = {
  id: string;
  tone?: "paper" | "blue";
};

export function SeaPattern({ id, tone = "paper" }: SeaPatternProps) {
  const barsId = `sea-pattern-bars-${id}`;
  const channelsId = `sea-pattern-channels-${id}`;
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
          id={barsId}
          width="78"
          height="900"
          patternUnits="userSpaceOnUse"
        >
          <rect className="sea-pattern__line" width="1.5" height="900" />
          <rect
            className="sea-pattern__line sea-pattern__line--warm"
            x="25"
            width="1"
            height="900"
          />
          <rect
            className="sea-pattern__line sea-pattern__line--soft"
            x="52"
            width="1.35"
            height="900"
          />
        </pattern>

        <mask
          id={channelsId}
          x="0"
          y="0"
          width="1440"
          height="900"
          maskUnits="userSpaceOnUse"
          maskContentUnits="userSpaceOnUse"
        >
          <rect width="1440" height="900" fill="white" />
          <path
            d="M-140 92C72-24 242 214 470 92S834-28 1048 98s374 98 548-22"
            fill="none"
            stroke="black"
            strokeWidth="76"
          />
          <path
            d="M-188 286C58 142 268 420 522 278s416-90 622 38 350 98 500-40"
            fill="none"
            stroke="black"
            strokeWidth="72"
          />
          <path
            d="M-126 486c230-126 392 96 610-18s392-110 596 18 374 116 546-18"
            fill="none"
            stroke="black"
            strokeWidth="78"
          />
          <path
            d="M-174 684c236-146 430 116 674-18s382-92 578 28 360 104 530-30"
            fill="none"
            stroke="black"
            strokeWidth="74"
          />
          <path
            d="M-124 862c218-108 382 64 590-38s390-82 594 32 368 82 548-36"
            fill="none"
            stroke="black"
            strokeWidth="70"
          />
        </mask>

        <pattern
          id={fieldId}
          width="1440"
          height="900"
          patternUnits="userSpaceOnUse"
        >
          <rect
            width="1440"
            height="900"
            fill={`url(#${barsId})`}
            mask={`url(#${channelsId})`}
          />
        </pattern>
      </defs>

      <rect width="100%" height="100%" fill={`url(#${fieldId})`} />
    </svg>
  );
}
