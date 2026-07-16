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

      {/* Slow-drifting prism mesh — each bloom is a different point on the coral->magenta
          ->violet->cyan spectrum, moving on its own independent path/timing so the
          composition never repeats mechanically. This is the actual technique behind
          Stripe/Linear-style 'alive' backgrounds — restrained motion, real color, not GIFs. */}
      <div className="mesh-drift-1 absolute top-[-10%] left-[8%] w-[36rem] h-[36rem] rounded-full blur-[100px] opacity-40" style={{ background: 'radial-gradient(circle, #FF6B4A, transparent 70%)' }} />
      <div className="mesh-drift-2 absolute top-[16%] right-[4%] w-[32rem] h-[32rem] rounded-full blur-[100px] opacity-35" style={{ background: 'radial-gradient(circle, #E5407E, transparent 70%)' }} />
      <div className="mesh-drift-3 absolute bottom-[-15%] left-[26%] w-[42rem] h-[42rem] rounded-full blur-[110px] opacity-30" style={{ background: 'radial-gradient(circle, #8B5CF6, transparent 70%)' }} />
      <div className="mesh-drift-1 absolute bottom-[5%] right-[18%] w-[26rem] h-[26rem] rounded-full blur-[100px] opacity-25" style={{ background: 'radial-gradient(circle, #06B6D4, transparent 70%)' }} />
    </div>
  );
}
