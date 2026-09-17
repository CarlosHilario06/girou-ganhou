import { DriverPanel } from "@/components/driver-panel";
import { getPaymentProvider } from "@/lib/payments";
import { isDriver } from "@/lib/session";
import { listPlays } from "@/lib/store";
import { getPrize } from "@/lib/prizes";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Painel do motorista · Girou, Ganhou!",
  robots: { index: false },
};

export default async function DriverPage() {
  const authorized = await isDriver();

  if (!authorized) {
    return <DriverPanel authorized={false} />;
  }

  const plays = listPlays();
  const provider = getPaymentProvider();

  const pendingPayments = plays.flatMap((play) =>
    play.payments
      .filter((payment) => payment.status === "pending")
      .map((payment) => ({
        id: payment.id,
        playName: play.name,
        playPhone: play.phone,
        amountCents: payment.amountCents,
        createdAt: payment.createdAt,
      })),
  );

  const paidPayments = plays.flatMap((play) =>
    play.payments.filter((payment) => payment.status === "paid"),
  );

  const prizes = plays.flatMap((play) =>
    play.spins.map((spin) => ({
      code: spin.code,
      title: getPrize(spin.prizeId)?.title ?? "Prêmio",
      emoji: getPrize(spin.prizeId)?.emoji ?? "🎁",
      winner: play.name,
      createdAt: spin.createdAt,
      redeemedAt: spin.redeemedAt,
    })),
  );

  return (
    <DriverPanel
      authorized
      providerId={provider.id}
      manualConfirmation={provider.manualConfirmation}
      stats={{
        players: plays.length,
        paidCount: paidPayments.length,
        revenueCents: paidPayments.reduce((sum, p) => sum + p.amountCents, 0),
        prizesGiven: prizes.filter((p) => p.redeemedAt).length,
        prizesPending: prizes.filter((p) => !p.redeemedAt).length,
      }}
      pendingPayments={pendingPayments}
      prizes={prizes
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 30)}
    />
  );
}
