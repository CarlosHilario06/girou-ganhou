"use client";

import { useState, type FormEvent } from "react";
import { Button, Field } from "./ui";

/** Máscara de celular brasileira aplicada enquanto o usuário digita. */
function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function CheckoutForm({
  onSubmit,
}: {
  onSubmit: (data: { name: string; phone: string }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (name.trim().split(" ").filter(Boolean).length < 1 || name.trim().length < 2) {
      setError("Digite seu nome.");
      return;
    }
    if (phone.replace(/\D/g, "").length < 10) {
      setError("Digite o celular com DDD.");
      return;
    }

    setLoading(true);
    try {
      await onSubmit({ name: name.trim(), phone });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Não foi possível continuar. Tente de novo.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <Field
        id="name"
        label="Seu nome"
        placeholder="Como o motorista deve te chamar"
        autoComplete="name"
        enterKeyHint="next"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <Field
        id="phone"
        label="Seu celular"
        placeholder="(14) 99999-9999"
        inputMode="numeric"
        autoComplete="tel"
        enterKeyHint="go"
        value={phone}
        onChange={(event) => setPhone(maskPhone(event.target.value))}
        hint="Só para identificar o prêmio. Nada de ligação de vendedor."
      />

      {error ? (
        <p
          role="alert"
          className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-300"
        >
          {error}
        </p>
      ) : null}

      <Button type="submit" variant="gold" size="lg" loading={loading} className="w-full">
        Liberar minha roleta
      </Button>
      <p className="text-center text-xs text-ink-muted">
        Ao continuar você concorda com as regras da promoção.
      </p>
    </form>
  );
}
