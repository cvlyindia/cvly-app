export function AmbientBackground({ mode = 'fixed' }: { mode?: 'fixed' | 'absolute' }) {
  const positionClass = mode === 'fixed' ? 'fixed' : 'absolute';
  return (
    <div className={`${positionClass} inset-0 -z-10 overflow-hidden pointer-events-none`}>
      {/* Subtle technical grid texture — reads as 'advanced product', not decorative */}
      <div
        className="absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--line) 1px, transparent 1px), linear-gradient(to bottom, var(--line) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 0%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 0%, transparent 70%)',
        }}
      />

      {/* Slow-drifting gradient mesh — each blob moves on its own independent path/timing
          so the composition never repeats mechanically. This is the actual technique behind
          Stripe/Linear-style 'alive' backgrounds — restrained motion, not GIFs. */}
      <div className="mesh-drift-1 absolute top-[-10%] left-[10%] w-[36rem] h-[36rem] rounded-full bg-[var(--accent-soft)] blur-[100px] opacity-40" />
      <div className="mesh-drift-2 absolute top-[20%] right-[5%] w-[30rem] h-[30rem] rounded-full bg-[var(--good-bg)] blur-[100px] opacity-30" />
      <div className="mesh-drift-3 absolute bottom-[-15%] left-[30%] w-[40rem] h-[40rem] rounded-full bg-[var(--accent-soft)] blur-[110px] opacity-25" />
    </div>
  );
}
