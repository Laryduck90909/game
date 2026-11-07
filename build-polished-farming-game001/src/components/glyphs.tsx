import type { CropId } from "../game/types";

export function CoinIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className="ico">
      <circle cx="16" cy="16" r="13" fill="#f0b429" stroke="#a56a10" strokeWidth="2" />
      <circle cx="16" cy="16" r="8" fill="none" stroke="#fff1b8" strokeWidth="2" />
      <path d="M16 9.5v13M12.5 13.5h6.2a2.4 2.4 0 0 1 0 4.8H13" fill="none" stroke="#8a5410" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="ico">
      <rect x="6" y="4" width="4.2" height="16" rx="1.4" fill="currentColor" />
      <rect x="13.8" y="4" width="4.2" height="16" rx="1.4" fill="currentColor" />
    </svg>
  );
}

export function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="ico">
      <path d="M4 9h3.2L12 5.5v13L7.2 15H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1z" fill="currentColor" />
      {muted ? (
        <path d="M16 9.5l5 5M21 9.5l-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <path d="M16 9.2a4 4 0 0 1 0 5.6M18.2 7a7 7 0 0 1 0 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      )}
    </svg>
  );
}

export function CropGlyph({ id }: { id: CropId }) {
  if (id === "radish") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true" className="glyph">
        <ellipse cx="18" cy="16" rx="5" ry="10" fill="#3aaa45" transform="rotate(-28 18 16)" />
        <ellipse cx="26" cy="15" rx="5" ry="10" fill="#2e8a3a" transform="rotate(24 26 15)" />
        <ellipse cx="24" cy="31" rx="8" ry="10" fill="#ef3d4d" />
        <ellipse cx="21" cy="28" rx="2" ry="3" fill="#fff" opacity=".75" />
      </svg>
    );
  }
  if (id === "wheat") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true" className="glyph">
        <path d="M16 40c2-10 1-18 0-24M24 40c1-12 0-20 0-28M32 40c-1-10 0-18 1-24" stroke="#e6b322" strokeWidth="2.4" strokeLinecap="round" />
        <ellipse cx="16" cy="14" rx="3" ry="6" fill="#f6d35a" />
        <ellipse cx="24" cy="11" rx="3" ry="7" fill="#f0c23a" />
        <ellipse cx="32" cy="14" rx="3" ry="6" fill="#e0a820" />
      </svg>
    );
  }
  if (id === "tomato") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true" className="glyph">
        <circle cx="18" cy="28" r="8" fill="#ef4034" />
        <circle cx="30" cy="27" r="8.5" fill="#e23d32" />
        <path d="M16 20c2-4 8-4 10 0 2-4 8-3 9 1" fill="#2f7a34" />
        <ellipse cx="16" cy="25" rx="2" ry="2.4" fill="#fff" opacity=".7" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="glyph">
      <ellipse cx="24" cy="28" rx="13" ry="11" fill="#f08a1e" />
      <path d="M18 28c1-8 2-8 3 0M24 27c0-9 1-9 2 0M29 28c0-8 2-8 3 0" stroke="#d2650d" strokeWidth="1.4" fill="none" />
      <path d="M24 17c2-5 6-6 7-8" stroke="#3a8f34" strokeWidth="2.4" strokeLinecap="round" />
      <ellipse cx="19" cy="25" rx="2.2" ry="3" fill="#fff" opacity=".45" />
    </svg>
  );
}
