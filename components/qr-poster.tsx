"use client";

import Image from "next/image";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { asset, BASE_PATH } from "@/lib/asset";

const EVENT_NAME = process.env.NEXT_PUBLIC_EVENT_NAME || "EMAPA 56 Anos";
const EVENT_CITY = process.env.NEXT_PUBLIC_EVENT_CITY || "Avaré";
const EVENT_LOGO = asset(process.env.NEXT_PUBLIC_EVENT_LOGO || "/brand/emapa.svg");
const PRICE_CENTS = Number(process.env.NEXT_PUBLIC_PLAY_PRICE_CENTS || 300);
const SPINS = Number(process.env.NEXT_PUBLIC_SPINS_PER_PAYMENT || 2);

/**
 * O cartaz é montado no navegador: assim ele funciona igual no app completo e
 * na versão estática, e o QR sempre aponta para o endereço de onde a página
 * está sendo aberta.
 */
export function QrPoster() {
  const [poster, setPoster] = useState<{ url: string; qr: string } | null>(null);

  useEffect(() => {
    const source =
      new URLSearchParams(window.location.search).get("src") || "encosto";
    const url = `${window.location.origin}${BASE_PATH}/?src=${encodeURIComponent(source)}`;

    QRCode.toDataURL(url, { margin: 1, width: 900, errorCorrectionLevel: "H" })
      .then((qr) => setPoster({ url, qr }))
      .catch(() => setPoster(null));
  }, []);

  const target = poster?.url ?? "";
  const qr = poster?.qr ?? null;

  const price = (PRICE_CENTS / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return (
    <div className="grid min-h-dvh place-items-center bg-brand-900 p-6 print:bg-white print:p-0">
      <div className="w-full max-w-sm overflow-hidden rounded-[28px] bg-white text-center shadow-2xl print:rounded-none print:shadow-none">
        <div className="bg-brand-800 px-6 pb-8 pt-6 text-white">
          <Image
            src={EVENT_LOGO}
            alt={`Logo ${EVENT_NAME}`}
            width={72}
            height={72}
            className="mx-auto h-18 w-18"
          />
          <p className="mt-3 font-display text-3xl leading-none text-gold">
            GIROU, GANHOU!
          </p>
          <p className="mt-2 text-sm text-brand-100">
            {SPINS} giros por {price} no Pix
          </p>
        </div>

        <div className="-mt-4 rounded-t-[28px] bg-white px-6 pb-2 pt-6">
          <div className="mx-auto grid h-[260px] w-[260px] place-items-center">
            {qr ? (
              <Image
                src={qr}
                alt="QR Code para acessar a roleta"
                width={260}
                height={260}
                unoptimized
                className="h-[260px] w-[260px]"
              />
            ) : (
              <span className="text-sm text-slate-400">Gerando QR Code…</span>
            )}
          </div>
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
          {EVENT_NAME} · {EVENT_CITY}
        </p>
      </div>
    </div>
  );
}
