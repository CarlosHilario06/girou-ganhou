"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
} from "react";
import type { Prize } from "@/lib/prizes";

const SIZE = 320;
const CENTER = SIZE / 2;
const RADIUS = 142;
const SPIN_TURNS = 6;
const SPIN_MS = 5200;

export type WheelHandle = {
  /** Gira até a fatia informada e resolve quando a animação termina. */
  spinTo: (index: number) => Promise<void>;
};

type WheelProps = {
  prizes: Prize[];
  isDark: boolean;
  spinning: boolean;
  ref?: Ref<WheelHandle>;
};

/** Converte ângulo (graus, 0 = topo, sentido horário) em coordenada do SVG. */
function pointAt(angle: number, radius: number): [number, number] {
  const radians = ((angle - 90) * Math.PI) / 180;
  return [
    CENTER + radius * Math.cos(radians),
    CENTER + radius * Math.sin(radians),
  ];
}

/** Fatia desenhada sempre no topo; o grupo pai é quem a gira até seu lugar. */
function slicePath(total: number): string {
  const step = 360 / total;
  const start = -step / 2;
  const end = step / 2;
  const [x1, y1] = pointAt(start, RADIUS);
  const [x2, y2] = pointAt(end, RADIUS);
  const largeArc = step > 180 ? 1 : 0;
  return `M ${CENTER} ${CENTER} L ${x1} ${y1} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

export function Wheel({ prizes, isDark, spinning, ref }: WheelProps) {
  const [rotation, setRotation] = useState(0);
  const wheelRef = useRef<SVGGElement>(null);
  const pointerRef = useRef<HTMLDivElement>(null);
  const resolveRef = useRef<(() => void) | null>(null);
  const step = 360 / prizes.length;

  useImperativeHandle(
    ref,
    () => ({
      spinTo(index: number) {
        return new Promise<void>((resolve) => {
          // Sorteia um desvio dentro da fatia para a roda não parar sempre
          // no mesmo ponto exato — dá sensação de giro real.
          const jitter = (Math.random() - 0.5) * step * 0.62;
          const target = (360 - index * step + jitter + 360) % 360;
          const current = ((rotation % 360) + 360) % 360;
          let delta = target - current;
          if (delta < 0) delta += 360;

          resolveRef.current = resolve;
          setRotation(rotation + delta + 360 * SPIN_TURNS);
        });
      },
    }),
    [rotation, step],
  );

  const handleTransitionEnd = useCallback(() => {
    resolveRef.current?.();
    resolveRef.current = null;
  }, []);

  // Balança o ponteiro a cada fatia que passa, como a lingueta de uma roleta.
  useEffect(() => {
    if (!spinning) return;
    let frame = 0;
    let lastSlice = -1;

    const tick = () => {
      const node = wheelRef.current;
      const pointer = pointerRef.current;
      if (node && pointer) {
        const matrix = new DOMMatrixReadOnly(getComputedStyle(node).transform);
        const angle = (Math.atan2(matrix.b, matrix.a) * 180) / Math.PI;
        const slice = Math.floor((((angle % 360) + 360) % 360) / step);
        if (slice !== lastSlice) {
          lastSlice = slice;
          pointer.classList.remove("ticker-hit");
          void pointer.offsetWidth;
          pointer.classList.add("ticker-hit");
        }
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [spinning, step]);

  return (
    <div className="relative mx-auto w-full max-w-[min(88vw,380px)] select-none">
      {/* Ponteiro */}
      <div
        ref={pointerRef}
        className="absolute left-1/2 top-[-6px] z-20 h-9 w-9 -translate-x-1/2 origin-top drop-shadow-lg"
        aria-hidden="true"
      >
        <svg viewBox="0 0 36 36" className="h-full w-full">
          <path
            d="M18 34 4 8a10 10 0 0 1 28 0Z"
            fill="var(--gold)"
            stroke="var(--brand-900)"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <circle cx="18" cy="10" r="3.4" fill="var(--brand-900)" />
        </svg>
      </div>

      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Roleta com ${prizes.length} prêmios: ${prizes
          .map((p) => p.title)
          .join(", ")}`}
      >
        <defs>
          <radialGradient id="wheel-rim" cx="50%" cy="30%">
            <stop offset="0%" stopColor="#122a57" />
            <stop offset="100%" stopColor="#04091a" />
          </radialGradient>
          <radialGradient id="wheel-hub" cx="50%" cy="30%">
            <stop offset="0%" stopColor={isDark ? "#1b3566" : "#ffffff"} />
            <stop offset="100%" stopColor={isDark ? "#0a1630" : "#dce7fb"} />
          </radialGradient>
          <filter id="wheel-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow
              dx="0"
              dy="8"
              stdDeviation="10"
              floodColor="#04091a"
              floodOpacity={isDark ? "0.65" : "0.28"}
            />
          </filter>
        </defs>

        {/* Aro dourado com lâmpadas, estilo parque de diversões */}
        <g filter="url(#wheel-shadow)">
          <circle cx={CENTER} cy={CENTER} r={RADIUS + 18} fill="url(#wheel-rim)" />
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS + 18}
            fill="none"
            stroke="var(--gold)"
            strokeWidth="3"
          />
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS + 2}
            fill="none"
            stroke="var(--gold)"
            strokeWidth="2"
            opacity="0.5"
          />
          {Array.from({ length: 16 }).map((_, index) => {
            const [x, y] = pointAt((360 / 16) * index, RADIUS + 10);
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="3.4"
                fill="var(--gold-soft)"
                opacity="0.95"
              />
            );
          })}
        </g>

        {/* Fatias — giram juntas */}
        <g
          ref={wheelRef}
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: `${CENTER}px ${CENTER}px`,
            transition: `transform ${SPIN_MS}ms cubic-bezier(0.16, 0.84, 0.16, 1)`,
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          {prizes.map((prize, index) => {
            const [labelX, labelY] = pointAt(0, RADIUS * 0.58);
            return (
              <g
                key={prize.id}
                transform={`rotate(${index * step} ${CENTER} ${CENTER})`}
              >
                <path
                  d={slicePath(prizes.length)}
                  fill={isDark ? prize.fillDark : prize.fill}
                  stroke="var(--brand-900)"
                  strokeWidth="2"
                />
                <text
                  x={labelX}
                  y={labelY - 16}
                  textAnchor="middle"
                  fontSize="24"
                  aria-hidden="true"
                >
                  {prize.emoji}
                </text>
                <text
                  x={labelX}
                  y={labelY + 8}
                  textAnchor="middle"
                  fill={prize.ink}
                  fontSize="17"
                  fontWeight="800"
                  letterSpacing="0.5"
                >
                  {prize.label}
                </text>
                {prize.sublabel ? (
                  <text
                    x={labelX}
                    y={labelY + 26}
                    textAnchor="middle"
                    fill={prize.ink}
                    fontSize="12"
                    fontWeight="700"
                    opacity="0.85"
                    letterSpacing="0.6"
                  >
                    {prize.sublabel}
                  </text>
                ) : null}
              </g>
            );
          })}
        </g>

        {/* Miolo */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r="44"
          fill="url(#wheel-hub)"
          stroke="var(--gold)"
          strokeWidth="4"
        />
      </svg>
    </div>
  );
}
