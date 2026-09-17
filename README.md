# 🎡 Girou, Ganhou!

Roleta de prêmios para motorista de aplicativo. O passageiro lê o QR Code
colado no encosto de cabeça, se cadastra, paga **R$ 3,00 no Pix** e ganha
**2 giros** numa roleta de **4 prêmios** — todos entregues na hora, dentro do
carro.

Feito para a **EMAPA 56 Anos (Avaré, 2026)**, com tema claro e escuro e as
cores da festa (azul escuro, dourado e verde).

---

## Como funciona

| Passo | O que acontece |
| --- | --- |
| 1 | Passageiro aponta a câmera para o QR Code no encosto |
| 2 | Cadastro rápido: nome e celular |
| 3 | A roleta aparece com os 4 prêmios à vista |
| 4 | Ao tocar em **GIRAR**, abre o popup com o QR Code do Pix de R$ 3,00 |
| 5 | Pix confirmado → 2 giros liberados automaticamente |
| 6 | Cada giro sorteia um prêmio e gera um **código** (ex.: `TNV-5DG`) |
| 7 | O motorista valida o código em `/motorista` e entrega o prêmio |

O sorteio acontece **no servidor**. O navegador só recebe qual fatia deve
ficar sob o ponteiro — ninguém ganha corrida grátis mexendo no console.

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # ajuste os valores
npm run dev                  # http://localhost:3000
```

Sem configurar nada, o app sobe no **modo demo**: gera um Pix de verdade na
tela e aprova sozinho em 6 segundos, para você ver o fluxo inteiro.

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm start` | Sobe o build |
| `npm test` | Testes do gerador de Pix e do sorteio |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |

## Páginas

| Rota | Para quem | O que é |
| --- | --- | --- |
| `/` | Passageiro | Cadastro, roleta e pagamento |
| `/qrcode` | Motorista | Cartaz do QR Code pronto para imprimir (Ctrl+P) e colar no encosto |
| `/motorista` | Motorista | Painel: validar códigos, liberar Pix manual e ver o caixa do dia |

O painel é protegido por PIN (`DRIVER_PIN`). **Troque o padrão `1234`.**

Dá para saber qual QR Code está dando resultado usando `?src=`:
`/?src=encosto`, `/?src=vidro`, `/?src=whatsapp`. A origem fica gravada na
jogada, e `/qrcode?src=vidro` gera o cartaz já com essa marcação.

## Pagamento: escolha o modo

A variável `PAYMENT_PROVIDER` decide como o dinheiro entra:

### `demo` (padrão)
Aprova sozinho depois de alguns segundos. **Só para testar e demonstrar** —
nunca use na festa, ou todo mundo gira de graça.

### `pix-static`
Pix direto na chave do motorista, sem intermediário e **sem taxa**. Como não
existe API para saber se caiu, o motorista confirma no painel:

```env
PAYMENT_PROVIDER=pix-static
PIX_KEY=14999999999
PIX_MERCHANT_NAME=NOME DO MOTORISTA
PIX_MERCHANT_CITY=AVARE
```

O passageiro paga → o Pix aparece em **/motorista → "Pix aguardando
confirmação"** → o motorista confere no app do banco e toca em *Liberar
giros*. A tela do passageiro destrava sozinha em segundos.

### `mercadopago`
Confirmação automática, sem o motorista precisar olhar o banco (cobra a taxa
do Mercado Pago):

```env
PAYMENT_PROVIDER=mercadopago
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...
MERCADOPAGO_WEBHOOK_URL=https://seu-dominio.com/api/payments/webhook
```

A confirmação chega por dois caminhos — webhook e consulta periódica — e o que
chegar primeiro libera os giros.

> Para plugar outro provedor (Efí, Asaas, PagBank), crie um arquivo em
> `lib/payments/` seguindo o tipo `PaymentProvider` e registre em
> `lib/payments/index.ts`. Nada mais do app precisa mudar.

## Personalizando

**Prêmios** — `lib/prizes.ts`. Cada prêmio tem texto, cor, emoji e um `weight`
(peso do sorteio; quanto maior, mais sai). A soma não precisa dar 100.

```ts
{ id: "corrida-gratis", label: "CORRIDA", sublabel: "GRÁTIS", weight: 5, ... }
```

A roleta se adapta ao número de fatias, mas 4 é o que cabe bem na tela do
celular.

**Preço e giros** — `.env.local`:

```env
PLAY_PRICE_CENTS=300      # R$ 3,00
SPINS_PER_PAYMENT=2       # giros por pagamento
PIX_EXPIRATION_MINUTES=15
PRIZE_VALIDITY_DAYS=30
```

**Logo do evento** — o arquivo em `public/brand/emapa.svg` é uma **recriação
aproximada** feita para o app não ficar sem marca. Para usar a arte oficial:

```bash
cp ~/Downloads/logo-emapa.png public/brand/emapa-oficial.png
```

```env
NEXT_PUBLIC_EVENT_LOGO=/brand/emapa-oficial.png
```

**Cores e tema** — `app/globals.css`. As variáveis do tema claro ficam em
`:root` e as do escuro em `.dark`. A troca de tema é animada com uma
revelação circular que nasce no ponto do clique (View Transitions API), com
queda suave para navegadores sem suporte e respeito a
`prefers-reduced-motion`.

## Onde os dados ficam

`STORAGE_DRIVER` escolhe a persistência:

- `memory` (padrão) — tudo em RAM. Some ao reiniciar. Bom para dev.
- `file` — grava em `.data/plays.json`. Serve para hospedagem Node com disco
  (Railway, Render, VPS). **Não funciona em serverless** (Vercel), onde o
  disco é descartado a cada requisição.

Para a festa de verdade, o caminho é trocar `load`/`persist` em `lib/store.ts`
por um banco (Postgres, Supabase, Turso). O resto do app não muda.

## Antes de ir para a rua

- [ ] `APP_SECRET` com 32+ caracteres aleatórios (`openssl rand -base64 32`)
- [ ] `DRIVER_PIN` diferente de `1234`
- [ ] `PAYMENT_PROVIDER` **não** está em `demo`
- [ ] `NEXT_PUBLIC_APP_URL` apontando para o domínio real (o cartaz do QR usa isso)
- [ ] `STORAGE_DRIVER=file` ou banco de verdade — em `memory` os prêmios somem se o servidor reiniciar
- [ ] Cartaz impresso a partir de `/qrcode` e testado com a câmera do celular
- [ ] Combinado com você mesmo: quantos prêmios grandes você aguenta pagar por noite (ajuste os `weight`)

## Como está protegido

- Prêmio e saldo de giros são decididos e guardados no servidor; o cookie de
  sessão é assinado com HMAC e só carrega o id da jogada.
- Cada giro debita um crédito antes de responder, então não dá para girar duas
  vezes com um pagamento.
- O crédito do pagamento é idempotente: webhook, consulta e confirmação manual
  podem chegar juntos que só o primeiro credita.
- Código de prêmio é de uso único e o painel recusa a segunda tentativa.
- Limite de requisições por IP no cadastro, na cobrança, no giro e no PIN.
- As páginas do jogo e do painel são `noindex`.

## Detalhe técnico: o Pix é real

`lib/pix.ts` monta o **BR Code (EMV MPM)** do Banco Central na mão, incluindo
o CRC16/CCITT-FALSE do campo 63 — o mesmo código que o app do banco lê. Os
testes conferem contra o vetor oficial do algoritmo (`123456789` → `29B1`) e
validam os campos obrigatórios do payload.

---

Stack: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4
