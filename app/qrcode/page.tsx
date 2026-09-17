import { QrPoster } from "@/components/qr-poster";
import {
  DISCOUNT_EVERY_SPINS,
  DISCOUNT_STEP_PERCENT,
  PLAY_PRICE_CENTS,
  formatBRL,
} from "@/lib/config";

export const metadata = {
  title: "Cartaz do QR Code · Girou, Ganhou!",
  robots: { index: false },
};

/**
 * Cartaz pronto para imprimir e colar no encosto de cabeça.
 * Abra em /qrcode?src=encosto e mande imprimir (Ctrl+P).
 */
export default function QrCodePage() {
  return (
    <QrPoster
      priceLabel={formatBRL(PLAY_PRICE_CENTS)}
      discountEvery={DISCOUNT_EVERY_SPINS}
      discountStep={DISCOUNT_STEP_PERCENT}
    />
  );
}
