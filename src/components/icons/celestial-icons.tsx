import * as React from "react";

/**
 * CelestialWorship icon set
 * Built to match Lucide's component pattern and stroke language:
 * currentColor stroke, no fill, round caps/joins, forwardRef, size/color/strokeWidth props.
 *
 * Icons that need more visual detail (Amure, CandleStandAltar, JSHMonogram,
 * FounderPortrait, MercyDayItems, MembersInSutana, MemberInPrayer, CCCBasilica)
 * use a larger canvas at a slightly lighter stroke (1.5-1.75) so the extra detail
 * still reads clearly at small sizes. CCCLogo stays on the strict 24x24 Lucide
 * grid since it is closer to a mark than an illustration.
 *
 * Usage:
 *   import { Amure, CCCBasilica } from "@/components/icons/celestial-icons";
 *   <Amure size={20} />
 *   <CCCBasilica size={24} color="var(--text-primary)" />
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

/* ─── Monochrome line icons ─── */

export const Amure = buildIcon(
  "Amure",
  <>
    <path d="M10 3 L16 3 L24 25 L18 25 Z" />
    <g strokeWidth={1.1} strokeLinecap="butt">
      <path d="M12 9 h3 M13.5 7.5 v3" />
      <path d="M15 15 h3 M16.5 13.5 v3" />
      <path d="M18 21 h3 M19.5 19.5 v3" />
    </g>
    <path d="M17 25 L15 30 M19 25 L19 30 M21 25 L23 30" />
  </>,
  { viewBox: "0 0 32 32", defaultStrokeWidth: 1.75 }
);

export const CandleStandAltar = buildIcon(
  "CandleStandAltar",
  <>
    <path d="M12 4 v17" />
    <path d="M12 4 v-1.5" />
    <circle cx="12" cy="2" r="0.6" fill="currentColor" stroke="none" />
    <path d="M12 10 L7 6 M7 6 v-2" />
    <circle cx="7" cy="3.6" r="0.6" fill="currentColor" stroke="none" />
    <path d="M12 13 L4.5 9 M4.5 9 v-2" />
    <circle cx="4.5" cy="6.6" r="0.6" fill="currentColor" stroke="none" />
    <path d="M12 16 L2.2 12.5 M2.2 12.5 v-2" />
    <circle cx="2.2" cy="10.1" r="0.6" fill="currentColor" stroke="none" />
    <path d="M12 10 L17 6 M17 6 v-2" />
    <circle cx="17" cy="3.6" r="0.6" fill="currentColor" stroke="none" />
    <path d="M12 13 L19.5 9 M19.5 9 v-2" />
    <circle cx="19.5" cy="6.6" r="0.6" fill="currentColor" stroke="none" />
    <path d="M12 16 L21.8 12.5 M21.8 12.5 v-2" />
    <circle cx="21.8" cy="10.1" r="0.6" fill="currentColor" stroke="none" />
    <path d="M9 21 h6 M7.5 24 h9 M6 27 h12 M8 24 v-3 M16 24 v-3" />
  </>,
  { viewBox: "0 0 24 28", defaultStrokeWidth: 1.5 }
);

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

export const JSHMonogram = buildIcon(
  "JSHMonogram",
  <>
    <path d="M9 6 h9 M13.5 6 v13 a3 3 0 0 1 -5 2.2" />
    <path d="M4 7 v14 M8.5 7 v14 M4 14 h4.5" />
    <path d="M23 7 v14 M18.5 7 v14 M23 14 h-4.5" />
    <path d="M9.5 26 h9" />
  </>,
  { viewBox: "0 0 27 30", defaultStrokeWidth: 1.6 }
);

export const FounderPortrait = buildIcon(
  "FounderPortrait",
  <>
    <path d="M9 9.5 a4 4 0 0 1 8 0 v1.5 a4 4 0 0 1 -8 0 z" />
    <path d="M8.5 8 q3.5 -3 7 0" />
    <path d="M6 25 v-3 a7 7 0 0 1 14 0 v3" />
    <path d="M9.5 15.5 v3 M14.5 15.5 v3" />
    <path d="M12.5 19 v3.5 M11 22 h3" />
  </>,
  { viewBox: "0 0 21 28", defaultStrokeWidth: 1.6 }
);

export const MercyDayItems = buildIcon(
  "MercyDayItems",
  <>
    <path d="M5 13 l1.6 -2.4 M8 13 l1.6 -2.4 M11 13 l-1.6 -2.4" />
    <path d="M4.5 15.5 a4 4 0 0 1 8 0 v3.5 a4 4 0 0 1 -8 0 z" />
    <circle cx="16" cy="12.5" r="2.3" />
    <circle cx="16" cy="17.5" r="2.3" />
    <rect x="22.5" y="9" width="5" height="16" rx="1.4" />
    <path d="M24 9 v-2.4 h2 v2.4" />
    <path d="M34.2 12.5 a1.4 1.4 0 0 0 -2.2 0 v2.6 h2.2 z" />
    <rect x="32.3" y="15" width="1.8" height="10" rx="0.5" />
  </>,
  { viewBox: "0 0 36 28", defaultStrokeWidth: 1.5 }
);

export const MembersInSutana = buildIcon(
  "MembersInSutana",
  <>
    <circle cx="9" cy="5" r="2.6" />
    <path d="M6.5 15 h5 l2 12 h-9 z" />
    <circle cx="20" cy="5" r="2.6" />
    <path d="M17.5 15 h5 l2 12 h-9 z" />
    <path d="M16.5 15.5 l3.5 2 3.5 -2" />
  </>,
  { viewBox: "0 0 29 30", defaultStrokeWidth: 1.6 }
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

export const CCCBasilica = buildIcon(
  "CCCBasilica",
  <>
    <path d="M16 3 v6 M13.5 6 h5" />
    <ellipse cx="16" cy="12.5" rx="1.6" ry="1" />
    <path d="M6 27 v-9 q10 -8 20 0 v9" />
    <path d="M6 27 h20" />
    <path d="M11 27 v-6 h4 v6" />
    <path d="M21 27 v-6 h-4" />
    <path d="M4 27 h24" />
    <path d="M4 20 l2 -2 M28 20 l-2 -2" />
  </>,
  { viewBox: "0 0 32 30", defaultStrokeWidth: 1.6 }
);

/* ─── Full-color variants (for splash, empty states, branding) ─── */

export const CCCLogoColor = React.forwardRef<SVGSVGElement, CelestialIconProps>(
  ({ size = 48, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Rainbow arches */}
      <path d="M3 15 a9 9 0 0 1 18 0" stroke="#DC2626" strokeWidth="1.6" />
      <path d="M4 15 a8 8 0 0 1 16 0" stroke="#F59E0B" strokeWidth="1.2" />
      <path d="M5 15 a7 7 0 0 1 14 0" stroke="#2539C7" strokeWidth="1.6" />
      <path d="M6 15 a6 6 0 0 1 12 0" stroke="#16A34A" strokeWidth="1.2" />
      <path d="M7 15 a5 5 0 0 1 10 0" stroke="#7C3AED" strokeWidth="1.6" />
      {/* Eye of God */}
      <ellipse cx="12" cy="12" rx="2" ry="1.3" stroke="#B8922F" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="0.5" fill="#B8922F" stroke="none" />
      {/* Cross */}
      <path d="M12 16.5 v4 M10.5 19 h3" stroke="#B8922F" strokeWidth="1.75" />
    </svg>
  )
);
CCCLogoColor.displayName = "CCCLogoColor";

export const CCCBasilicaColor = React.forwardRef<SVGSVGElement, CelestialIconProps>(
  ({ size = 48, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 32 30"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Cross + eye */}
      <path d="M16 3 v6 M13.5 6 h5" stroke="#B8922F" strokeWidth="1.8" />
      <ellipse cx="16" cy="12.5" rx="1.6" ry="1" stroke="#B8922F" strokeWidth="1.5" />
      {/* Building */}
      <path d="M6 27 v-9 q10 -8 20 0 v9" stroke="#2539C7" strokeWidth="1.6" />
      <path d="M6 27 h20" stroke="#2539C7" strokeWidth="1.6" />
      <path d="M11 27 v-6 h4 v6" stroke="#2539C7" strokeWidth="1.4" />
      <path d="M21 27 v-6 h-4" stroke="#2539C7" strokeWidth="1.4" />
      {/* Base */}
      <path d="M4 27 h24" stroke="#1C2DA0" strokeWidth="1.8" />
      <path d="M4 20 l2 -2 M28 20 l-2 -2" stroke="#B8922F" strokeWidth="1.4" />
    </svg>
  )
);
CCCBasilicaColor.displayName = "CCCBasilicaColor";
