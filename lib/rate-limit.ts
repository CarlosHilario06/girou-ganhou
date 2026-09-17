/**
 * Limitador de requisições simples, em memória — segura robô de criar mil
 * jogadas ou marretar código de prêmio. Para múltiplas instâncias, troque por
 * Redis/Upstash mantendo a mesma assinatura.
 */
type Bucket = { count: number; resetAt: number };

const globalBuckets = globalThis as unknown as {
  __giroulimit?: Map<string, Bucket>;
};

const buckets = (globalBuckets.__giroulimit ??= new Map<string, Bucket>());

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): { ok: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }
  return { ok: true, retryAfterSeconds: 0 };
}

export function clientKey(request: Request, scope: string): string {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || "local";
  return `${scope}:${ip}`;
}
