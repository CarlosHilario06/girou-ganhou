import path from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Faz o Node entender os imports que o TypeScript entende:
 *  - o atalho "@/..." do tsconfig;
 *  - caminhos sem extensão ("./asset" em vez de "./asset.ts").
 *
 * Sem isso os testes só alcançariam módulos sem dependência nenhuma.
 */
const root = path.resolve(import.meta.dirname, "..");

export async function resolve(specifier, context, next) {
  const mapped = specifier.startsWith("@/")
    ? pathToFileURL(path.join(root, specifier.slice(2))).href
    : specifier;

  try {
    return await next(mapped, context);
  } catch (error) {
    for (const suffix of [".ts", ".tsx", "/index.ts"]) {
      try {
        return await next(mapped + suffix, context);
      } catch {
        // Tenta o próximo sufixo.
      }
    }
    throw error;
  }
}
