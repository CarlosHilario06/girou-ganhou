import { demoProvider } from "./demo";
import { mercadoPagoProvider } from "./mercadopago";
import { pixStaticProvider } from "./pix-static";
import type { PaymentProvider } from "./types";

export type { PaymentProvider } from "./types";

const PROVIDERS: Record<string, PaymentProvider> = {
  demo: demoProvider,
  "pix-static": pixStaticProvider,
  mercadopago: mercadoPagoProvider,
};

export function getPaymentProvider(): PaymentProvider {
  const id = process.env.PAYMENT_PROVIDER || "demo";
  const provider = PROVIDERS[id];
  if (!provider) {
    throw new Error(
      `PAYMENT_PROVIDER inválido: "${id}". Use demo, pix-static ou mercadopago.`,
    );
  }
  return provider;
}
