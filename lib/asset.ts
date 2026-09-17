/**
 * No GitHub Pages o site mora em /<nome-do-repo>, e imagens referenciadas por
 * caminho absoluto ("/brand/emapa.svg") caem fora dele. Esta função prefixa o
 * basePath quando existe; no app completo (basePath vazio) ela não muda nada.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function asset(path: string): string {
  if (/^(https?:)?\/\//.test(path) || path.startsWith("data:")) return path;
  return `${BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`;
}
