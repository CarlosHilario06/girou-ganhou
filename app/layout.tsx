import type { Metadata, Viewport } from "next";
import { Bungee, Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider, themeBootstrapScript } from "@/components/theme";
import {
  DISCOUNT_EVERY_SPINS,
  DISCOUNT_STEP_PERCENT,
  EVENT,
  PLAY_PRICE_CENTS,
  formatBRL,
} from "@/lib/config";
import { WINNING_PRIZES } from "@/lib/prizes";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

/** Fonte de letreiro, no espírito do letreiro da festa. */
const bungee = Bungee({
  variable: "--font-bungee",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

// A descrição sai da configuração: preço, giros e prêmios mudam num lugar só,
// e a prévia compartilhada não fica prometendo o que a roleta não dá.
const chamada = `Giros a partir de ${formatBRL(
  PLAY_PRICE_CENTS,
)} no Pix, ${DISCOUNT_STEP_PERCENT}% de desconto a cada ${DISCOUNT_EVERY_SPINS} giros, ${
  WINNING_PRIZES.length
} prêmios.`;

export const metadata: Metadata = {
  title: `Girou, Ganhou! · ${EVENT.name}`,
  description: `Gire a roleta e ganhe prêmios na hora durante a ${EVENT.name}. ${chamada}`,
  openGraph: {
    title: `Girou, Ganhou! · ${EVENT.name}`,
    description: `${chamada} O prêmio sai na hora, dentro do carro.`,
    type: "website",
  },
  robots: { index: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eaf1fd" },
    { media: "(prefers-color-scheme: dark)", color: "#04091a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Aplica o tema salvo antes da primeira pintura, sem flash de tela branca. */}
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className={`${jakarta.variable} ${bungee.variable} antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
