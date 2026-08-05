type HarpoonIconProps = {
  className?: string;
  direction?: "north-east" | "south";
};

export function HarpoonIcon({
  className,
  direction = "north-east",
}: HarpoonIconProps) {
  const classes = [
    "harpoon-icon",
    `harpoon-icon--${direction}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <svg
      className={classes}
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
    >
      <path className="harpoon-icon__shaft" d="M10.8 33.2 31.3 12.8" />
      <path
        className="harpoon-icon__head"
        d="M43 4 35 18 27 9Z"
      />
      <path className="harpoon-icon__barb" d="m31.4 13.2-7.1 2.2 4.9 4.8Z" />
      <circle className="harpoon-icon__eye" cx="10.8" cy="33.2" r="2.55" />
      <path
        className="harpoon-icon__rope"
        d="M8.7 34.8c-4.1 3.3-5.8-.4-4.7-4.4 1.6-5.8 7.4-7 11.2-2.7 5.7 6.4 9.5 15.4 18.6 14.3 7.5-.9 10.1-8.5 5.2-12.2-3.2-2.4-7-.5-7.9 2.2"
      />
    </svg>
  );
}
