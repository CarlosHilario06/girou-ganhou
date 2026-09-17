"use client";

import { formatBRL, MAX_SPINS_PER_PURCHASE } from "@/lib/config";
import { quoteFor } from "@/lib/pricing";
import { spinsLabel } from "@/lib/config";

/**
 * Régua de quantos giros comprar. Mostra o preço já com desconto e o quanto
 * falta para o próximo degrau — o empurrãozinho que faz o passageiro subir um.
 *
 * O preço daqui é só a vitrine: quem calcula o que será cobrado é o servidor,
 * com a mesma função.
 */
export function SpinsPicker({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (spins: number) => void;
  disabled?: boolean;
}) {
  const quote = quoteFor(value);

  return (
    <div className="rounded-2xl border border-line bg-surface-2 p-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">
            Quantos giros?
          </p>
          <p className="font-display text-2xl leading-tight text-ink">
            {spinsLabel(quote.spins)}
          </p>
        </div>

        <div className="text-right">
          {quote.discountCents > 0 ? (
            <p className="text-xs font-semibold text-ink-muted line-through">
              {formatBRL(quote.subtotalCents)}
            </p>
          ) : null}
          <p className="font-display text-2xl leading-tight text-ink">
            {formatBRL(quote.totalCents)}
          </p>
        </div>
      </div>

      <input
        type="range"
        min={1}
        max={MAX_SPINS_PER_PURCHASE}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label="Quantidade de giros"
        aria-valuetext={`${spinsLabel(quote.spins)} por ${formatBRL(quote.totalCents)}`}
        className="spins-range mt-4 w-full"
      />

      <div className="mt-1 flex justify-between text-[11px] font-semibold text-ink-muted">
        <span>1</span>
        <span>{MAX_SPINS_PER_PURCHASE}</span>
      </div>

      <div className="mt-3 flex min-h-[1.75rem] flex-wrap items-center gap-2 text-xs">
        {quote.discountPercent > 0 ? (
          <span className="rounded-full border border-festa-green/40 bg-festa-green/15 px-2.5 py-1 font-bold text-festa-green">
            {quote.discountPercent}% OFF · economize {formatBRL(quote.discountCents)}
          </span>
        ) : null}

        {quote.spinsToNextTier !== undefined ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(value + (quote.spinsToNextTier ?? 0))}
            className="rounded-full border border-dashed border-line-strong px-2.5 py-1 font-semibold text-ink-muted transition-colors hover:border-accent hover:text-accent"
          >
            +{quote.spinsToNextTier} giro{quote.spinsToNextTier > 1 ? "s" : ""} e
            leve {quote.nextTierPercent}% OFF
          </button>
        ) : (
          <span className="text-ink-muted">Desconto máximo atingido 🎉</span>
        )}
      </div>
    </div>
  );
}
