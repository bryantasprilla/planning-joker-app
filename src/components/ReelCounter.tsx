import { useEffect, useState, type CSSProperties } from 'react';

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const MIN_REELS = 3;

// Slot-machine reels: one window per digit, each a 0–9 strip slid into place.
// Starts at zero and rolls to the real count once mounted, then rolls again on every new hand.
export function ReelCounter({ value, label }: { value: number; label: string }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(value));
    return () => cancelAnimationFrame(frame);
  }, [value]);

  // Always at least three reels (000, 007, 042), with thousands commas once it grows past that.
  const digits = value.toString().padStart(MIN_REELS, '0');
  const text = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const shownDigits = shown.toString().padStart(digits.length, '0');
  let digitIndex = 0;

  return (
    <p className="reel-counter">
      <span className="reel-frame" aria-hidden="true">
        {[...text].map((ch, i) => {
          if (ch === ',') {
            return (
              <span key={i} className="reel-sep">
                ,
              </span>
            );
          }
          const index = digitIndex++;
          return (
            <span key={i} className="reel">
              <span className="reel-strip" style={{ '--d': shownDigits[index], '--i': index } as CSSProperties}>
                {DIGITS.map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </span>
            </span>
          );
        })}
      </span>
      <span className="reel-label" aria-hidden="true">
        {label}
      </span>
      <span className="sr-only">
        {value.toLocaleString('en-US')} {label.toLowerCase()}
      </span>
    </p>
  );
}
