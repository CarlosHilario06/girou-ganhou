export type PaymentStatus = "pending" | "paid" | "expired" | "canceled";

export type Payment = {
  id: string;
  playId: string;
  provider: string;
  /** Id da cobrança no provedor externo (Mercado Pago, etc). */
  externalId?: string;
  amountCents: number;
  /** Quantos giros este pagamento libera. */
  spins: number;
  status: PaymentStatus;
  /** Pix copia e cola. */
  payload: string;
  createdAt: string;
  expiresAt: string;
  paidAt?: string;
  /** Quem confirmou manualmente, quando não foi automático. */
  confirmedBy?: string;
};

export type SpinRecord = {
  id: string;
  playId: string;
  prizeId: string;
  /** Código que o ganhador mostra ao motorista. Fatia sem prêmio não tem. */
  code?: string;
  createdAt: string;
  redeemedAt?: string;
};

export type Play = {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
  /** De onde veio o acesso: qr do encosto, link no WhatsApp, etc. */
  source?: string;
  spinsAvailable: number;
  payments: Payment[];
  spins: SpinRecord[];
};

export type PrizeRow = {
  code: string;
  prizeId: string;
  winner: string;
  createdAt: string;
  redeemedAt?: string;
};

export type PendingPaymentRow = {
  id: string;
  playName: string;
  playPhone: string;
  amountCents: number;
  createdAt: string;
};

export type Stats = {
  players: number;
  paidCount: number;
  revenueCents: number;
  prizesGiven: number;
  prizesPending: number;
};

/**
 * Operações que o app precisa do armazenamento.
 *
 * As três marcadas como atômicas são as que mexem em dinheiro e prêmio: elas
 * têm de decidir sozinhas, numa única ida ao banco, senão duas requisições
 * simultâneas conseguem gastar o mesmo giro duas vezes.
 */
export type Store = {
  createPlay(data: {
    name: string;
    phone: string;
    source?: string;
  }): Promise<Play>;
  getPlay(id: string): Promise<Play | undefined>;

  addPayment(payment: Payment): Promise<void>;
  getPayment(id: string): Promise<Payment | undefined>;
  findPaymentByExternalId(externalId: string): Promise<Payment | undefined>;
  findPendingPayment(playId: string): Promise<Payment | undefined>;
  /** Marca como expirados os Pix vencidos, liberando nova tentativa. */
  expireStalePayments(playId?: string): Promise<void>;
  markPaymentExpired(paymentId: string): Promise<void>;
  /**
   * ATÔMICO: marca pago e credita os giros do próprio pagamento.
   * false se já estava pago.
   */
  creditPayment(paymentId: string, confirmedBy?: string): Promise<boolean>;

  /** ATÔMICO: desconta um giro. false quando não há saldo. */
  consumeSpin(playId: string): Promise<boolean>;
  addSpin(spin: SpinRecord): Promise<void>;
  findSpinByCode(
    code: string,
  ): Promise<{ spin: SpinRecord; winner: string } | undefined>;
  /** ATÔMICO: marca o prêmio como entregue. false se já tinha sido. */
  redeemSpin(code: string): Promise<boolean>;

  getStats(): Promise<Stats>;
  listPendingPayments(limit?: number): Promise<PendingPaymentRow[]>;
  listRecentPrizes(limit?: number): Promise<PrizeRow[]>;
};
