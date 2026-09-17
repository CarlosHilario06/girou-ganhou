import type { Metadata, Viewport } from "next";
import { Bungee, Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider, themeBootstrapScript } from "@/components/theme";
import { EVENT } from "@/lib/config";
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

export const metadata: Metadata = {
  title: `Girou, Ganhou! · ${EVENT.name}`,
  description: `Gire a roleta e ganhe prêmios na hora durante a ${EVENT.name}. R$ 3 no Pix, 2 giros, 4 prêmios.`,
  openGraph: {
    title: `Girou, Ganhou! · ${EVENT.name}`,
    description:
      "Pague R$ 3 no Pix, gire 2 vezes e receba seu prêmio na hora, dentro do carro.",
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
