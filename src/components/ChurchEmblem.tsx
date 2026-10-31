import type { CSSProperties } from 'react';

/** The emblem of the Celestial Church of Christ, simplified to stay clear at icon size: the rainbow, the eye, the crown and the cross. The words are in public/church-emblem.svg. */
export function ChurchEmblem({ size = 24, className, style }: { size?: number; className?: string; style?: CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 800 800" className={className} style={style} aria-hidden="true">
      <g transform="translate(0 120)">
        <path d="M2 370A398 398 0 0 1 798 370Z" fill="#2A1F7A"/>
        <path d="M60 370A340 340 0 0 1 740 370Z" fill="#FFF200"/>
        <path d="M115 370A285 285 0 0 1 685 370Z" fill="#0E9F4F"/>
        <path d="M168 370A232 232 0 0 1 632 370Z" fill="#E0167E"/>
        <path d="M217 370A183 183 0 0 1 583 370Z" fill="#DD2A1F"/>
        <path d="M257 370A143 143 0 0 1 543 370Z" fill="#EE7A16"/>
        <path d="M295 370A105 105 0 0 1 505 370Z" fill="#FFFFFF"/>
        <path d="M340 296c34-34 86-34 120 0-34 34-86 34-120 0Z" fill="#fff" stroke="#2A1F7A" strokeWidth="8"/>
        <circle cx="400" cy="296" r="21" fill="#2A1F7A"/>
        <path d="M336 358v-22l22 10 18-18 24 16 24-16 18 18 22-10v22Z" fill="#2A1F7A"/>
        <path d="M385 372h30v30h30v28h-30v62h-30v-62h-30v-28h30Z" fill="#2A1F7A" stroke="#fff" strokeWidth="8" paintOrder="stroke"/>
      </g>
    </svg>
  );
}
