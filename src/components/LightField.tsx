import { useEffect, useRef } from 'react';

/**
 * "Luceat Lux" — a field of drifting gold motes. Motes near the pointer
 * brighten and are drawn toward it; a tap or click sends out a ripple of light.
 */
export default function LightField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0, h = 0, dpr = 1, raf = 0;
    const pointer = { x: -9999, y: -9999, active: false };
    const ripples: { x: number; y: number; r: number; a: number }[] = [];
    type Mote = { x: number; y: number; vx: number; vy: number; r: number; tw: number; base: number };
    let motes: Mote[] = [];

    function resize() {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width; h = rect.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(160, (w * h) / 7000));
      motes = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - .5) * .25, vy: -Math.random() * .35 - .05,
        r: Math.random() * 1.8 + .6, tw: Math.random() * Math.PI * 2, base: Math.random() * .5 + .25,
      }));
    }

    function frame(t: number) {
      ctx.clearRect(0, 0, w, h);
      // soft glow following the pointer
      if (pointer.active) {
        const g = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 220);
        g.addColorStop(0, 'rgba(212,174,60,0.20)');
        g.addColorStop(1, 'rgba(212,174,60,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
      for (const m of motes) {
        const dx = pointer.x - m.x, dy = pointer.y - m.y;
        const d = Math.hypot(dx, dy);
        const near = pointer.active ? Math.max(0, 1 - d / 180) : 0;
        if (!reduce) {
          if (near > 0) { m.vx += (dx / (d || 1)) * near * .05; m.vy += (dy / (d || 1)) * near * .05; }
          m.vx *= .97; m.vy = m.vy * .97 - .004;
          m.x += m.vx; m.y += m.vy;
          if (m.y < -10) { m.y = h + 10; m.x = Math.random() * w; m.vy = -Math.random() * .35 - .05; }
          if (m.x < -10) m.x = w + 10; else if (m.x > w + 10) m.x = -10;
        }
        const twinkle = .5 + .5 * Math.sin(t / 900 + m.tw);
        const alpha = Math.min(1, m.base * (.6 + .4 * twinkle) + near * .9);
        const rad = m.r * (1 + near * 1.6);
        ctx.beginPath();
        ctx.fillStyle = `rgba(240,205,100,${alpha})`;
        ctx.shadowColor = 'rgba(240,205,100,0.9)';
        ctx.shadowBlur = 6 + near * 14;
        ctx.arc(m.x, m.y, rad, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.r += 4; r.a -= .015;
        if (r.a <= 0) { ripples.splice(i, 1); continue; }
        ctx.beginPath();
        ctx.strokeStyle = `rgba(212,174,60,${r.a})`;
        ctx.lineWidth = 1.5;
        ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        ctx.stroke();
        for (const m of motes) {
          const d = Math.hypot(m.x - r.x, m.y - r.y);
          if (Math.abs(d - r.r) < 6 && !reduce) { m.vx += (m.x - r.x) / d * .6; m.vy += (m.y - r.y) / d * .6; }
        }
      }
      raf = requestAnimationFrame(frame);
    }

    const host = canvas.parentElement!;
    const pos = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left; pointer.y = e.clientY - rect.top; pointer.active = true;
    };
    const leave = () => { pointer.active = false; pointer.x = pointer.y = -9999; };
    const down = (e: PointerEvent) => { pos(e); ripples.push({ x: pointer.x, y: pointer.y, r: 4, a: .8 }); };

    resize();
    raf = requestAnimationFrame(frame);
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    host.addEventListener('pointermove', pos);
    host.addEventListener('pointerleave', leave);
    host.addEventListener('pointerdown', down);
    return () => {
      cancelAnimationFrame(raf); ro.disconnect();
      host.removeEventListener('pointermove', pos);
      host.removeEventListener('pointerleave', leave);
      host.removeEventListener('pointerdown', down);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" />;
}
