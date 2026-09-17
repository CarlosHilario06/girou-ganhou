import { QrPoster } from "@/components/qr-poster";

export const metadata = {
  title: "Cartaz do QR Code · Girou, Ganhou!",
  robots: { index: false },
};

/**
 * Cartaz pronto para imprimir e colar no encosto de cabeça.
 * Abra em /qrcode?src=encosto e mande imprimir (Ctrl+P).
 */
export default function QrCodePage() {
  return <QrPoster />;
}
