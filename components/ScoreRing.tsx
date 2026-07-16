'use client';

export function ScoreRing({ score, size = 128 }: { score: number; size?: number }) {
  const radius = size * 0.4;
  const circumference = 2 * Math.PI * radius;
  const targetOffset = circumference - (score / 100) * circumference;
  const color = score >= 75 ? 'var(--good)' : score >= 50 ? 'var(--warn)' : 'var(--bad)';
  const shadow = score >= 75 ? 'rgba(22,121,79,0.28)' : score >= 50 ? 'rgba(146,96,10,0.28)' : 'rgba(180,35,46,0.28)';
  const label = score >= 75 ? 'Strong fit' : score >= 50 ? 'Getting there' : 'Needs work';
  const c = size / 2;

  return (
    <div className="relative flex flex-col items-center shrink-0">
      <div
        className="absolute rounded-full blur-2xl opacity-[0.28] pointer-events-none"
        style={{ background: color, inset: -size * 0.1 }}
      />
      <svg
        width={size} height={size} viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90 relative"
        style={{ filter: `drop-shadow(0 4px 10px ${shadow})` }}
      >
        <circle cx={c} cy={c} r={radius} fill="none" stroke="var(--line)" strokeWidth={size * 0.028} />
        <circle
          key={score}
          cx={c} cy={c} r={radius} fill="none"
          stroke={color} strokeWidth={size * 0.028} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={targetOffset}
          style={{
            animation: 'ringFill 1.15s cubic-bezier(0.16,1,0.3,1) both',
            ['--ring-circ' as string]: circumference,
          } as React.CSSProperties}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center gap-[3px]">
        <span className="font-bold tracking-tight tabular-nums" style={{ color, fontSize: size * 0.24 }}>{score}</span>
        <span className="text-[10px] font-semibold text-[var(--muted-soft)] mt-1.5">/100</span>
      </div>
      <span
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold mt-3 px-2.5 py-1 rounded-full"
        style={{ color, background: score >= 75 ? 'var(--good-bg)' : score >= 50 ? 'var(--warn-bg)' : 'var(--bad-bg)' }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
        {label}
      </span>
    </div>
  );
}
