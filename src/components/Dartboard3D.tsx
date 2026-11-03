/** A dartboard drawn in SVG that revolves in 3D (CSS perspective spin). */
export function Dartboard3D({ className = "size-32" }: { className?: string }) {
  const order = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
  const seg = (i: number, r1: number, r2: number) => {
    const a1 = ((i * 18 - 99) * Math.PI) / 180;
    const a2 = (((i + 1) * 18 - 99) * Math.PI) / 180;
    const p = (r: number, a: number) => `${100 + r * Math.cos(a)} ${100 + r * Math.sin(a)}`;
    return `M ${p(r1, a1)} L ${p(r2, a1)} A ${r2} ${r2} 0 0 1 ${p(r2, a2)} L ${p(r1, a2)} A ${r1} ${r1} 0 0 0 ${p(r1, a1)} Z`;
  };
  const dark = "oklch(0.18 0.01 260)", light = "oklch(0.9 0.04 90)", red = "oklch(0.55 0.2 27)", green = "oklch(0.55 0.15 150)";
  return (
    <div className={`dartboard-3d ${className}`} aria-hidden="true">
      <svg viewBox="0 0 200 200" className="size-full drop-shadow-2xl">
        <circle cx="100" cy="100" r="99" fill={dark} />
        {order.map((n, i) => {
          const odd = i % 2 === 0;
          return (
            <g key={n}>
              <path d={seg(i, 9, 50)} fill={odd ? dark : light} />
              <path d={seg(i, 50, 56)} fill={odd ? red : green} />
              <path d={seg(i, 56, 78)} fill={odd ? dark : light} />
              <path d={seg(i, 78, 84)} fill={odd ? red : green} />
              <text
                x={100 + 92 * Math.cos(((i * 18 - 90) * Math.PI) / 180)}
                y={100 + 92 * Math.sin(((i * 18 - 90) * Math.PI) / 180) + 3}
                fontSize="9" fontWeight="700" textAnchor="middle" fill={light}
              >{n}</text>
            </g>
          );
        })}
        <circle cx="100" cy="100" r="9" fill={green} />
        <circle cx="100" cy="100" r="4" fill={red} />
      </svg>
    </div>
  );
}
