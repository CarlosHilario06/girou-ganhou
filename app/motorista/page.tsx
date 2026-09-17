import { DriverPanel } from "@/components/driver-panel";
import { getPaymentProvider } from "@/lib/payments";
import { getPrize } from "@/lib/prizes";
import { isDriver } from "@/lib/session";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Painel do motorista · Girou, Ganhou!",
  robots: { index: false },
};

export default async function DriverPage() {
  if (!(await isDriver())) {
    return <DriverPanel authorized={false} />;
  }

  const store = getStore();
  const provider = getPaymentProvider();

  await store.expireStalePayments();
  const [stats, pendingPayments, prizes] = await Promise.all([
    store.getStats(),
    store.listPendingPayments(),
    store.listRecentPrizes(30),
  ]);

  return (
    <DriverPanel
      authorized
      providerId={provider.id}
      manualConfirmation={provider.manualConfirmation}
      stats={stats}
      pendingPayments={pendingPayments}
      prizes={prizes.map((prize) => ({
        code: prize.code,
        title: getPrize(prize.prizeId)?.title ?? "Prêmio",
        emoji: getPrize(prize.prizeId)?.emoji ?? "🎁",
        winner: prize.winner,
        createdAt: prize.createdAt,
        redeemedAt: prize.redeemedAt,
      }))}
    />
  );
}
