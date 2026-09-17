# 🎡 Girou, Ganhou!

Roleta de prêmios para motorista de aplicativo. O passageiro lê o QR Code
colado no encosto de cabeça, se cadastra, paga **R$ 3,00 no Pix** e ganha
**1 giro** numa roleta de 6 fatias. Deu prêmio, o motorista entrega na hora,
dentro do carro.

### Os prêmios e a chance de cada um

| Fatia | Chance | Sai a cada |
| --- | --- | --- |
| 😅 Não foi dessa vez (duas fatias, uma de cada lado da roda) | 73,5% | — |
| 🥜 1 paçoca | 25% | ~4 giros |
| 🚗 Não paga a corrida | 1% | ~100 giros |
| 🎟️ 3 ingressos do parque | 0,3% | ~333 giros |
| 💸 R$ 30,00 no Pix | 0,2% | ~500 giros |

Os pesos em `lib/prizes.ts` somam 1000, então **cada 10 pontos valem 1%** — dá
para mexer sem calcular nada.

> **Nenhuma fatia pode ter peso 0.** Prêmio que o passageiro vê na roda e não
> tem como sair é propaganda enganosa (CDC art. 37). Prêmio de vitrine existe:
> é só usar o menor peso possível, não zero. Há um teste que barra isso.

Feito para a **EMAPA 56 Anos (Avaré, 2026)**, com tema claro e escuro e as
cores da festa (azul escuro, dourado e verde).

---

## Como funciona

| Passo | O que acontece |
| --- | --- |
| 1 | Passageiro aponta a câmera para o QR Code no encosto |
| 2 | Cadastro rápido: nome e celular |
| 3 | A roleta aparece com os prêmios à vista, e o letreiro do topo mostra quem já ganhou |
| 4 | Ao tocar em **GIRAR**, abre o popup com o QR Code do Pix de R$ 3,00 |
| 5 | Pix confirmado → o giro é liberado automaticamente |
| 6 | Cada giro sorteia uma fatia; se for prêmio, gera um **código** (ex.: `TNV-5DG`) |
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
| `npm test` | Testes: Pix, sorteio, pagamento e banco (Postgres de verdade, em WASM) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |
| `npm run build:static` | Build estático (o mesmo que vai para o GitHub Pages) |

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

### `mercadopago` — o recomendado para a festa
Confirmação automática, sem o motorista precisar olhar o app do banco:

```env
PAYMENT_PROVIDER=mercadopago
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...
MERCADOPAGO_WEBHOOK_URL=https://seu-dominio.com/api/payments/webhook
```

O Access Token de produção está em **mercadopago.com.br → Seu negócio → 
Configurações → Gestão e administração → Credenciais → Credenciais de
produção**. Dali só o *Access Token* é usado; Public Key, Client ID e Client
Secret não entram neste app.

A confirmação chega por dois caminhos — webhook e consulta periódica — e o que
chegar primeiro libera os giros. Cadastre a URL do webhook no painel do
Mercado Pago (Suas integrações → sua aplicação → Webhooks), no evento
**Pagamentos**.

> **O webhook não acredita no que recebe.** Ele pega só o id da notificação e
> pergunta ao Mercado Pago qual é o status real. Um POST forjado dizendo
> `"status": "approved"` não libera giro nenhum — isso é testado em
> `tests/payments.test.ts`.

> Para plugar outro provedor (Efí, Asaas, PagBank), crie um arquivo em
> `lib/payments/` seguindo o tipo `PaymentProvider` e registre em
> `lib/payments/index.ts`. Nada mais do app precisa mudar.

## Personalizando

**Prêmios** — `lib/prizes.ts`. Cada fatia tem texto, cor, emoji, um `weight`
(peso do sorteio; quanto maior, mais sai) e `win` (false na fatia que não dá
prêmio — ela não gera código nem aparece no painel do motorista).

```ts
{ id: "ingresso-parque", label: "3 INGRESSOS", sublabel: "DO PARQUE", weight: 2, win: true }
```

A roleta se adapta ao número de fatias. Com mais de 8 o texto começa a ficar
apertado na tela do celular. Se usar duas fatias iguais de "não ganhou nada",
deixe uma longe da outra na lista — lado a lado elas viram um bloco só na
roda (tem teste para isso).

**Preço e giros** — `.env.local`:

```env
PLAY_PRICE_CENTS=300      # R$ 3,00
SPINS_PER_PAYMENT=1       # giros por pagamento
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

**Letreiro de ganhadores** — a faixa do topo mostra **ganhadores reais**,
tirados do banco, só com o primeiro nome. Enquanto ninguém ganhou nada na
noite, ela mostra os prêmios em jogo, para nunca ficar vazia nem inventar
gente. Nome falso em promoção é o tipo de coisa que vira discussão no primeiro
passageiro que perguntar quem é.

**Cores e tema** — `app/globals.css`. As variáveis do tema claro ficam em
`:root` e as do escuro em `.dark`. A troca de tema é animada com uma
revelação circular que nasce no ponto do clique (View Transitions API), com
queda suave para navegadores sem suporte e respeito a
`prefers-reduced-motion`.

## Publicação no GitHub Pages (versão vitrine)

### Ligando o Pages (uma vez só)

O GitHub não deixa o workflow criar o site sozinho. Antes do primeiro deploy,
abra **Settings → Pages** do repositório e escolha **Source: GitHub Actions**.
Depois disso todo push publica sozinho. O endereço fica
`https://<seu-usuario>.github.io/girou-ganhou/`.

O workflow `.github/workflows/pages.yml` publica o app no GitHub Pages a cada
push. **Mas o Pages só serve arquivos estáticos — ele não roda servidor.**
Para caber lá, o build de Pages:

- remove `app/api` e `app/motorista` (precisam de servidor);
- liga o modo estático, em que o sorteio, o saldo de giros e os prêmios ficam
  no `localStorage` do navegador do próprio jogador (`lib/game-client.ts`);
- troca a confirmação do Pix por um botão **"Já paguei"** apertado pelo
  próprio jogador, já que não há ninguém do lado de fora para conferir.

Ou seja: a versão do Pages serve para **mostrar o app** — abre no celular,
gira, mostra o prêmio e imprime o cartaz do QR. Não serve para valer dinheiro,
porque quem quiser pode limpar o `localStorage` e girar de graça. A página
avisa isso em cima, com todas as letras.

**Para a festa de verdade**, suba a versão completa (com `/api` e
`/motorista`) em qualquer hospedagem que rode Node — Vercel, Railway, Render
ou uma VPS. Aí o sorteio acontece no servidor e o Pix é conferido de verdade.

Para o QR do Pages cobrar na sua chave, defina as *variables* do repositório
em **Settings → Secrets and variables → Actions → Variables**: `PIX_KEY`,
`PIX_MERCHANT_NAME` e `PIX_MERCHANT_CITY`.

## No ar

**https://girou-ganhou-carloshilario06.vercel.app**

| Endereço | Para quem |
| --- | --- |
| `/` | o passageiro, pelo QR Code do encosto |
| `/qrcode` | o cartaz para imprimir (abra e dê Ctrl+P) |
| `/motorista` | o painel, protegido por PIN |

Rodando com Pix do Mercado Pago (confirmação automática) e banco Postgres no
Neon. O deploy sai do diretório do projeto pelo CLI da Vercel:

```bash
npx vercel deploy --prod
```

Para publicar a cada `git push`, conecte o repositório em **Vercel → Project →
Settings → Git**.

## Subindo para valer (Vercel)

O caminho mais curto para a festa:

1. Faça login em [vercel.com](https://vercel.com) com a conta do GitHub e
   importe este repositório.
2. Em **Settings → Environment Variables**, cadastre (marcando *Production*):

   | Variável | Valor |
   | --- | --- |
   | `APP_SECRET` | resultado de `openssl rand -base64 32` |
   | `DRIVER_PIN` | um PIN só seu, nada de `1234` |
   | `PAYMENT_PROVIDER` | `mercadopago` |
   | `MERCADOPAGO_ACCESS_TOKEN` | o Access Token de produção |
   | `MERCADOPAGO_WEBHOOK_URL` | `https://<seu-app>.vercel.app/api/payments/webhook` |
   | `NEXT_PUBLIC_APP_URL` | `https://<seu-app>.vercel.app` |
   | `STORAGE_DRIVER` | `postgres` |
   | `DATABASE_URL` | a connection string do seu banco |

3. Crie o banco: em [neon.com](https://neon.com) (ou Supabase) o plano grátis
   dá conta de sobra para uma noite de festa. Copie a *connection string* e
   cole em `DATABASE_URL`.
4. Faça o deploy, abra `/qrcode`, imprima e cole no encosto.

> Se deixar `STORAGE_DRIVER=memory` em produção, os prêmios somem a cada
> reinício do servidor — e o passageiro fica com um código que o painel não
> reconhece.

## Segredos: onde eles nunca podem estar

Access Token, `APP_SECRET` e PIN **nunca** entram no repositório. Eles vivem
só no `.env.local` da sua máquina (ignorado pelo git) e nas variáveis de
ambiente da hospedagem.

Se um token escapar — foi colado num chat, num print, num grupo de WhatsApp —
entre no painel do Mercado Pago e clique em **renovar credenciais**. Isso
invalida o token antigo na hora. Renovar é grátis e leva segundos; um token de
produção vazado dá acesso à movimentação da conta.

## Onde os dados ficam

`STORAGE_DRIVER` escolhe a persistência:

- `memory` (padrão) — tudo em RAM. Some ao reiniciar. Bom para desenvolver.
- `postgres` — banco de verdade, apontado por `DATABASE_URL`. É o que vale
  para a festa.

```env
STORAGE_DRIVER=postgres
DATABASE_URL=postgres://usuario:senha@host/banco
```

Serve qualquer Postgres — **Neon**, **Supabase**, **Railway**, **Render** ou
Vercel. As tabelas são criadas sozinhas na primeira vez que o app sobe; não
há migração para rodar à mão.

O driver é escolhido pela própria URL: endereços do Neon usam a conexão
**HTTPS** do `@neondatabase/serverless` — sem porta 5432 e sem conexão presa,
que é o que serverless precisa — e qualquer outro Postgres usa TCP normal. O
SQL é o mesmo nos dois casos.

### Por que Postgres, e não um arquivo

Três operações deste app mexem em dinheiro e prêmio, e todas precisam decidir
sozinhas, numa única ida ao banco:

- **creditar o pagamento** — uma instrução só (`with pago as (update … where
  status = 'pending') …`), e uma instrução no Postgres já é atômica. Webhook,
  consulta de status e confirmação manual podem chegar no mesmo instante; só o
  primeiro credita;
- **gastar um giro** — o desconto é a própria condição (`where spins_available
  > 0`), então dez cliques ao mesmo tempo gastam dois giros, não dez;
- **entregar o prêmio** — `where redeemed_at is null`, então dois celulares
  confirmando o mesmo código ao mesmo tempo só entregam uma vez.

Guardar isso num arquivo JSON funcionaria numa demonstração e falharia numa
fila de passageiros. Os testes em `tests/store.test.ts` rodam a mesma bateria
nos dois armazenamentos — inclusive as disputas simultâneas — contra um
Postgres de verdade (PGlite, o Postgres compilado em WebAssembly).

## Antes de ir para a rua

- [ ] `APP_SECRET` com 32+ caracteres aleatórios (`openssl rand -base64 32`)
- [ ] `DRIVER_PIN` diferente de `1234`
- [ ] `PAYMENT_PROVIDER` **não** está em `demo`
- [ ] `NEXT_PUBLIC_APP_URL` apontando para o domínio real (o cartaz do QR usa isso)
- [ ] `STORAGE_DRIVER=postgres` com `DATABASE_URL` — em `memory` os prêmios somem se o servidor reiniciar
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
