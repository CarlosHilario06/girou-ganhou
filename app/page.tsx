import { Game } from "@/components/game";
import {
  DRIVER,
  EVENT,
  PLAY_PRICE_CENTS,
  SPINS_PER_PAYMENT,
  formatBRL,
} from "@/lib/config";
import { PRIZES } from "@/lib/prizes";

export default function HomePage() {
  return (
    <Game
      prizes={PRIZES}
      event={{ ...EVENT }}
      driver={{ ...DRIVER }}
      priceLabel={formatBRL(PLAY_PRICE_CENTS)}
      spinsPerPayment={SPINS_PER_PAYMENT}
    />
  );
}
