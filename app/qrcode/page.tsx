import Image from "next/image";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { EVENT, PLAY_PRICE_CENTS, SPINS_PER_PAYMENT, formatBRL } from "@/lib/config";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Cartaz do QR Code · Girou, Ganhou!",
  robots: { index: false },
};

/**
 * Cartaz pronto para imprimir e colar no encosto de cabeça.
 * Abra em /qrcode?src=encosto e mande imprimir (Ctrl+P).
 */
export default async function QrCodePage({
  searchParams,
}: PageProps<"/qrcode">) {
  const params = await searchParams;
  const source = typeof params.src === "string" ? params.src : "encosto";

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? "https";
  const base =
    process.env.NEXT_PUBLIC_APP_URL || (host ? `${protocol}://${host}` : "");
  const target = `${base}/?src=${encodeURIComponent(source)}`;

  const qr = await QRCode.toDataURL(target, {
    margin: 1,
    width: 900,
    errorCorrectionLevel: "H",
  });

  return (
    <div className="grid min-h-dvh place-items-center bg-brand-900 p-6 print:bg-white print:p-0">
      <div className="w-full max-w-sm overflow-hidden rounded-[28px] bg-white text-center shadow-2xl print:rounded-none print:shadow-none">
        <div className="bg-brand-800 px-6 pb-8 pt-6 text-white">
          <Image
            src={EVENT.logo}
            alt={`Logo ${EVENT.name}`}
            width={72}
            height={72}
            className="mx-auto h-18 w-18"
          />
          <p className="mt-3 font-display text-3xl leading-none text-gold">
            GIROU, GANHOU!
          </p>
          <p className="mt-2 text-sm text-brand-100">
            {SPINS_PER_PAYMENT} giros por {formatBRL(PLAY_PRICE_CENTS)} no Pix
          </p>
        </div>

        <div className="-mt-4 rounded-t-[28px] bg-white px-6 pb-2 pt-6">
          <Image
            src={qr}
            alt="QR Code para acessar a roleta"
            width={260}
            height={260}
            unoptimized
            className="mx-auto h-[260px] w-[260px]"
          />
          <p className="mt-3 text-sm font-bold text-brand-900">
            Aponte a câmera e gire a roleta
          </p>
          <p className="mt-1 text-xs text-slate-500">
            4 prêmios · entrega na hora, aqui no carro
          </p>
          <p className="mt-4 break-all border-t border-slate-200 pt-3 text-[10px] text-slate-400">
            {target}
          </p>
        </div>

        <p className="bg-gold py-2 text-xs font-black uppercase tracking-widest text-brand-950">
          {EVENT.name} · {EVENT.city}
        </p>
      </div>
    </div>
  );
}
