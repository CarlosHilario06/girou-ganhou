import type { NextConfig } from "next";

/**
 * O app tem dois alvos:
 *
 *  1. Padrão (`next build`): app completo, com as rotas /api. É o que vale
 *     para a festa — sorteio e saldo de giros ficam no servidor.
 *  2. `STATIC_EXPORT=1 next build`: exportação estática para o GitHub Pages.
 *     Sem servidor, o jogo roda inteiro no navegador (ver lib/game-client.ts).
 *     Serve para mostrar o app; não serve para valer dinheiro.
 *
 * O workflow de Pages remove app/api e app/motorista antes do build, porque
 * rota de servidor não existe em hospedagem estática.
 */
const isStaticExport = process.env.STATIC_EXPORT === "1";

/** No GitHub Pages o site mora em /<nome-do-repo>. */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = isStaticExport
  ? {
      output: "export",
      basePath,
      // Sem servidor não há otimização de imagem sob demanda.
      images: { unoptimized: true },
      trailingSlash: true,
    }
  : {};

export default nextConfig;
