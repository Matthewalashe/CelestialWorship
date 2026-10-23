import * as React from "react";

/**
 * CelestialWorship icons, in Lucide's style: currentColor stroke, no fill, round caps and joins,
 * forwardRef, size/color/strokeWidth props. MemberInPrayer uses a larger canvas with a lighter stroke
 * for its detail; CCCLogo stays on Lucide's 24x24 grid.
 */

export interface CelestialIconProps extends React.SVGProps<SVGSVGElement> {
  size?: string | number;
  strokeWidth?: string | number;
}

interface BuildOptions {
  viewBox: string;
  defaultStrokeWidth: number;
}

function buildIcon(
  displayName: string,
  children: React.ReactNode,
  { viewBox, defaultStrokeWidth }: BuildOptions
) {
  const Icon = React.forwardRef<SVGSVGElement, CelestialIconProps>(
    (
      {
        color = "currentColor",
        size = 24,
        strokeWidth = defaultStrokeWidth,
        ...props
      },
      ref
    ) => (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox={viewBox}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        {children}
      </svg>
    )
  );
  Icon.displayName = displayName;
  return Icon;
}

export const CCCLogo = buildIcon(
  "CCCLogo",
  <>
    <path d="M3 15 a9 9 0 0 1 18 0" />
    <path d="M5 15 a7 7 0 0 1 14 0" />
    <path d="M7 15 a5 5 0 0 1 10 0" />
    <ellipse cx="12" cy="12" rx="2" ry="1.3" />
    <circle cx="12" cy="12" r="0.5" fill="currentColor" stroke="none" />
    <path d="M12 16.5 v4 M10.5 19 h3" />
  </>,
  { viewBox: "0 0 24 24", defaultStrokeWidth: 1.75 }
);

export const MemberInPrayer = buildIcon(
  "MemberInPrayer",
  <>
    <path d="M2 25 h26" />
    <circle cx="6.5" cy="21" r="2.2" />
    <path d="M8.5 22 l6 -2" />
    <path d="M14.5 20 q4 -8 9 -1" />
    <path d="M8 22.5 l-4.5 2" />
  </>,
  { viewBox: "0 0 30 28", defaultStrokeWidth: 1.6 }
);
