/**
 * Reaction glyphs as inline SVG.
 *
 * Drawn rather than typed for one reason: emoji depend on a font that may not
 * exist. On a machine without a colour-emoji font, "👍" is an empty rectangle —
 * which reads as a broken feature rather than a reaction. These render
 * identically everywhere, at any size, in the brand colours.
 */
import type { ReactionKey } from "./chat";

const TONE = "#d90429";
const YELLOW = "#f4b400";

export function ReactionIcon({ name, size = 14 }: { name: ReactionKey; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "like":
      /* Thumbs up */
      return (
        <svg {...common} stroke={TONE} strokeWidth="2">
          <path d="M7 10v10H4.5A1.5 1.5 0 0 1 3 18.5v-7A1.5 1.5 0 0 1 4.5 10H7Z" fill={TONE} fillOpacity="0.15" />
          <path d="M7 10l4.2-6.3a1.7 1.7 0 0 1 2.9.9V8h4.3a2 2 0 0 1 2 2.4l-1.3 7A2 2 0 0 1 17 19H7" fill={TONE} fillOpacity="0.15" />
        </svg>
      );
    case "love":
      /* Heart */
      return (
        <svg {...common} fill={TONE} stroke={TONE} strokeWidth="1.5">
          <path d="M12 20.3S3.8 15.4 3.8 9.6A4.6 4.6 0 0 1 12 6.9a4.6 4.6 0 0 1 8.2 2.7c0 5.8-8.2 10.7-8.2 10.7Z" />
        </svg>
      );
    case "laugh":
      /* Grinning, closed eyes */
      return (
        <svg {...common} stroke={YELLOW} strokeWidth="1.8">
          <circle cx="12" cy="12" r="9.2" fill={YELLOW} fillOpacity="0.18" />
          <path d="M7.6 10.2l1.6 1.5-1.6 1.5M16.4 10.2l-1.6 1.5 1.6 1.5" />
          <path d="M7.6 14.4h8.8a4.4 4.4 0 0 1-8.8 0Z" fill={YELLOW} fillOpacity="0.85" />
        </svg>
      );
    case "happy":
      /* Smiling, open eyes */
      return (
        <svg {...common} stroke={YELLOW} strokeWidth="1.8">
          <circle cx="12" cy="12" r="9.2" fill={YELLOW} fillOpacity="0.18" />
          <circle cx="9" cy="9.8" r="0.9" fill={YELLOW} stroke="none" />
          <circle cx="15" cy="9.8" r="0.9" fill={YELLOW} stroke="none" />
          <path d="M8.2 14.2a4.4 4.4 0 0 0 7.6 0" />
        </svg>
      );
    case "sad":
      /* Frowning, tear */
      return (
        <svg {...common} stroke={YELLOW} strokeWidth="1.8">
          <circle cx="12" cy="12" r="9.2" fill={YELLOW} fillOpacity="0.18" />
          <circle cx="9" cy="10" r="0.9" fill={YELLOW} stroke="none" />
          <circle cx="15" cy="10" r="0.9" fill={YELLOW} stroke="none" />
          <path d="M8.2 16.6a4.4 4.4 0 0 1 7.6 0" />
          <path d="M17.6 12.2c.9 1.3 1.4 2 1.4 2.6a1.4 1.4 0 0 1-2.8 0c0-.6.5-1.3 1.4-2.6Z" fill="#3b82f6" stroke="none" />
        </svg>
      );
    case "fire":
      /* Flame */
      return (
        <svg {...common}>
          <path
            d="M12 2.6s5.4 4.2 5.4 9.1A5.4 5.4 0 0 1 12 17.1a5.4 5.4 0 0 1-5.4-5.4c0-1.7.8-3.2 1.7-4.4.2 1.3.9 2.2 1.9 2.4C10.3 7.4 12 2.6 12 2.6Z"
            fill={TONE}
            fillOpacity="0.25"
            stroke={TONE}
            strokeWidth="1.7"
          />
          <path d="M12 21.4c1.9 0 3.2-1.2 3.2-2.8 0-1.7-1.6-2.6-3.2-4.6-1.6 2-3.2 2.9-3.2 4.6 0 1.6 1.3 2.8 3.2 2.8Z" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1.2" />
        </svg>
      );
    case "celebrate":
    default:
      /* Clapping hands, simplified to a sparkle burst */
      return (
        <svg {...common} stroke={TONE} strokeWidth="1.9">
          <path d="M12 3.2v2.4M12 18.4v2.4M4.6 11.2h2.4M17 11.2h2.4M6.8 6l1.7 1.7M15.5 15.2l1.7 1.7M17.2 6l-1.7 1.7M8.5 15.2 6.8 17" />
          <circle cx="12" cy="12" r="2.6" fill={TONE} fillOpacity="0.2" />
        </svg>
      );
  }
}
