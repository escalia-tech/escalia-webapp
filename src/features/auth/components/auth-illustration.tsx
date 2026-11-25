/**
 * Original decorative illustration (minimalist building facades). It is NOT a brand asset, does not
 * imitate the logo, and is purely decorative (aria-hidden). Colours come from design tokens only.
 */
export function AuthIllustration({ className }: { className?: string }) {
  const towers = [
    { x: 20, w: 70, h: 150, rows: 6, cols: 3 },
    { x: 100, w: 90, h: 230, rows: 9, cols: 4 },
    { x: 200, w: 64, h: 120, rows: 5, cols: 3 },
    { x: 274, w: 100, h: 190, rows: 7, cols: 4 },
  ] as const;
  const base = 300;

  return (
    <svg viewBox="0 0 400 320" role="presentation" aria-hidden focusable="false" className={className}>
      <line x1="0" y1={base} x2="400" y2={base} className="stroke-foreground/25" strokeWidth="2" />
      {towers.map((tower) => (
        <g key={tower.x}>
          <rect
            x={tower.x}
            y={base - tower.h}
            width={tower.w}
            height={tower.h}
            rx="3"
            className="fill-background/70 stroke-foreground/30"
            strokeWidth="2"
          />
          {Array.from({ length: tower.rows }, (_, row) =>
            Array.from({ length: tower.cols }, (_, col) => {
              const cellW = (tower.w - 16) / tower.cols;
              const cellH = (tower.h - 24) / tower.rows;
              const lit = (row * 3 + col * 5 + tower.x) % 7 === 0;
              return (
                <rect
                  key={`${row}-${col}`}
                  x={tower.x + 8 + col * cellW + 3}
                  y={base - tower.h + 12 + row * cellH + 3}
                  width={cellW - 6}
                  height={cellH - 6}
                  rx="1.5"
                  className={lit ? "fill-primary/40" : "fill-foreground/10"}
                />
              );
            }),
          )}
        </g>
      ))}
    </svg>
  );
}
