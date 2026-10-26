import * as React from 'react';

/**
 * Icons for things particular to Celestial worship, drawn to sit beside Lucide's: a 24×24 grid,
 * 1.75 stroke, round caps and joins, currentColor. Each shape is kept to a few strokes so it still
 * reads at 16px. (The Church's emblem is not drawn here: the official artwork is used where it appears.)
 */

export interface CelestialIconProps extends React.SVGProps<SVGSVGElement> {
  size?: string | number;
  strokeWidth?: string | number;
}

function icon(displayName: string, children: React.ReactNode) {
  const Icon = React.forwardRef<SVGSVGElement, CelestialIconProps>(({ color = 'currentColor', size = 24, strokeWidth = 1.75, ...props }, ref) => (
    <svg ref={ref} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
         strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden={props['aria-label'] ? undefined : true} {...props}>
      {children}
    </svg>
  ));
  Icon.displayName = displayName;
  return Icon;
}

/** A lit white candle on its holder */
export const Candle = icon('Candle', <>
  <path d="M12 2.5c1.7 1.9 2.3 3.2 2.3 4.3a2.3 2.3 0 0 1-4.6 0c0-1.1.6-2.4 2.3-4.3Z" />
  <path d="M12 9.1v1.4" />
  <rect x="9.5" y="10.5" width="5" height="9" rx="0.8" />
  <path d="M7 21.5h10" />
</>);

/** The altar: the table with the cross between two lit candles */
export const Altar = icon('Altar', <>
  <path d="M12 3v8M9.5 5.5h5" />
  <path d="M6 9.5v4M18 9.5v4" />
  <path d="M6 6.4c.6.6.9 1.1.9 1.5a.9.9 0 0 1-1.8 0c0-.4.3-.9.9-1.5ZM18 6.4c.6.6.9 1.1.9 1.5a.9.9 0 0 1-1.8 0c0-.4.3-.9.9-1.5Z" />
  <rect x="3" y="13.5" width="18" height="3.5" rx="0.6" />
  <path d="M5.5 17v4M18.5 17v4" />
</>);

/** The white garment (sutana), with the cross worn at the chest */
export const Sutana = icon('Sutana', <>
  <path d="M9.3 3.5h5.4L17 5l3 7-2 .9-2.2-4.4L16.6 21H7.4l.8-12.5L6 12.9 4 12l3-7Z" />
  <path d="M10.4 3.5a1.6 1.6 0 0 0 3.2 0" />
  <path d="M12 7.2v3.6M10.6 8.5h2.8" />
</>);

/** The censer (incense) on its chains, with rising smoke */
export const Censer = icon('Censer', <>
  <circle cx="12" cy="3" r="1" />
  <path d="M11.4 3.8 8.2 10M12.6 3.8 15.8 10" />
  <path d="M7 10h10l-1.3 4.8a3.8 3.8 0 0 1-7.4 0Z" />
  <path d="M10 20h4M12 18.6V20" />
  <path d="M18.5 8.5c.9-.9.3-1.8 1-2.7" />
</>);

/** Holy water: a drop marked with the cross */
export const HolyWater = icon('HolyWater', <>
  <path d="M12 2.8S5.8 9.5 5.8 14a6.2 6.2 0 0 0 12.4 0c0-4.5-6.2-11.2-6.2-11.2Z" />
  <path d="M12 10.5v6.5M9.6 13h4.8" />
</>);

/** A worshipper kneeling in prayer, hands raised */
export const Kneeling = icon('Kneeling', <>
  <circle cx="9" cy="4.5" r="2" />
  <path d="M9 7.2v6.8" />
  <path d="M9 9.5l3.6-.6.4-3.4" />
  <path d="M9 14l4 6M13 20H6.5" />
  <path d="M3 21.5h18" />
</>);

/** Seven Halleluyahs: raised hands with light */
export const Halleluyah = icon('Halleluyah', <>
  <path d="M8 21v-5.5L5.5 9.8a1.2 1.2 0 0 1 2.2-1l2 4.2V5.7a1.2 1.2 0 0 1 2.4 0V12" />
  <path d="M16 21v-5.5l2.5-5.7a1.2 1.2 0 0 0-2.2-1l-2 4.2V5.7a1.2 1.2 0 0 0-2.4 0" />
  <path d="M12 2v1.2M5 4.2l.9.8M19 4.2l-.9.8" />
</>);
