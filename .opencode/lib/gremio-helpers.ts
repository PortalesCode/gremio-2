/**
 * gremio-helpers.ts — Funciones puras del plugin `gremio_estado`.
 *
 * Vive en `.opencode/lib/` (y NO en `.opencode/plugins/`) porque OpenCode
 * auto-carga todo archivo de `plugins/`: este módulo no debe registrarse como
 * plugin. Solo usa `fs` y `path`; no depende de `@opencode-ai/plugin`, así que
 * puede testearse en un clon fresco sin el runtime de OpenCode.
 */

import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";

export const MARCAS_WEB = [
  "react",
  "next",
  "vue",
  "nuxt",
  "svelte",
  "angular",
  "astro",
  "gatsby",
  "remix",
  "solid-js",
  "preact",
  "ember",
  "vite",
];

/** Scopes de paquetes que no siguen el patrón `@<marca>/`. */
export const SCOPES_WEB: Record<string, string[]> = {
  vite: ["@vitejs/"],
  remix: ["@remix-run/"],
  svelte: ["@sveltejs/"],
  astro: ["@astrojs/"],
  "solid-js": ["@solidjs/"],
};

export const MARCADORES_WEB = [
  "index.html",
  "public/index.html",
  "src/index.html",
  "src/App.tsx",
  "src/App.jsx",
  "src/App.vue",
  "src/App.svelte",
  "app/page.tsx",
  "pages/index.tsx",
];

/** Carpetas comunes donde puede vivir la app dentro del repo (hermana a `.opencode/`). */
export const SUBDIRS_APP = ["app", "src", "web", "frontend", "client", "site"];

export const PATRONES_TEST = [
  /^test_.*\.py$/,
  /.*_test\.py$/,
  /.*\.test\.[jt]sx?$/,
  /.*\.spec\.[jt]sx?$/,
  /.*_test\.go$/,
  /.*_spec\.rb$/,
];

/**
 * ¿La dependencia `dep` pertenece a la marca `marca`?
 *
 * Match preciso (no substring): `vitest` NO debe contar como `vite`.
 * Acepta el nombre exacto, el prefijo `<marca>-` y el scope `@<marca>/`,
 * más los scopes alternativos declarados en `SCOPES_WEB`.
 */
export function coincideMarca(dep: string, marca: string): boolean {
  return (
    dep === marca ||
    dep.startsWith(`${marca}-`) ||
    dep.startsWith(`@${marca}/`) ||
    (SCOPES_WEB[marca] ?? []).some((scope) => dep.startsWith(scope))
  );
}

export function leerRama(gitDir: string): string | null {
  try {
    const head = readFileSync(join(gitDir, "HEAD"), "utf-8").trim();
    const m = head.match(/^ref:\s*refs\/heads\/(.+)$/);
    if (m) return m[1];
    return head.slice(0, 8) || null;
  } catch {
    return null;
  }
}

export function leerRemoto(gitDir: string): string | null {
  try {
    const cfg = readFileSync(join(gitDir, "config"), "utf-8");
    const bloque = cfg.match(/\[remote\s+"[^"]+"\]([\s\S]*?)(?=\n\[|$)/);
    if (!bloque) return null;
    const url = bloque[1].match(/url\s*=\s*(.+)/);
    return url ? url[1].trim() : null;
  } catch {
    return null;
  }
}

export function tieneCommits(gitDir: string, rama: string | null): boolean {
  try {
    if (rama && existsSync(join(gitDir, "refs", "heads", rama))) return true;
    const packed = join(gitDir, "packed-refs");
    if (rama && existsSync(packed)) {
      return readFileSync(packed, "utf-8").includes(`refs/heads/${rama}`);
    }
    return false;
  } catch {
    return false;
  }
}

/** Prefijo legible de una base respecto de la raíz ("" para la raíz misma). */
function etiqueta(raiz: string, base: string): string {
  return base === raiz ? "" : `${base.slice(raiz.length + 1)}/`;
}

export function detectarWeb(raiz: string): { es: boolean; stack: string[]; senales: string[] } {
  const stack: string[] = [];
  const senales: string[] = [];
  const bases = [raiz, ...SUBDIRS_APP.map((d) => join(raiz, d))];

  for (const base of bases) {
    const pkg = join(base, "package.json");
    if (!existsSync(pkg)) continue;
    try {
      const j = JSON.parse(readFileSync(pkg, "utf-8"));
      const deps = Object.keys({
        ...(j.dependencies ?? {}),
        ...(j.devDependencies ?? {}),
      });
      for (const marca of MARCAS_WEB) {
        const hit = deps.find((d) => coincideMarca(d, marca));
        if (hit && !stack.includes(marca)) {
          stack.push(marca);
          senales.push(`${etiqueta(raiz, base)}package.json: ${hit}`);
        }
      }
    } catch {
      /* package.json ausente o inválido */
    }
  }

  for (const base of bases) {
    for (const p of MARCADORES_WEB) {
      if (existsSync(join(base, p))) senales.push(`${etiqueta(raiz, base)}${p}`);
    }
  }

  return { es: stack.length > 0 || senales.length > 0, stack, senales };
}

export function leerHerramientas(raiz: string): Record<string, boolean> | null {
  try {
    const cfg = join(raiz, "opencode.json");
    if (!existsSync(cfg)) return null;
    const j = JSON.parse(readFileSync(cfg, "utf-8"));
    const mcpRoot = j.mcp && typeof j.mcp === "object" ? j.mcp : {};
    const mcp =
      mcpRoot.servers && typeof mcpRoot.servers === "object" ? mcpRoot.servers : mcpRoot;
    const out: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(mcp)) {
      const valor = v as { enabled?: boolean; disabled?: boolean } | null;
      const enabled =
        valor && typeof valor === "object"
          ? valor.enabled !== false && valor.disabled !== true
          : true;
      out[k] = enabled;
    }
    return Object.keys(out).length > 0 ? out : null;
  } catch {
    return null;
  }
}

export function tieneTests(raiz: string): boolean {
  const bases = [raiz, ...SUBDIRS_APP.map((d) => join(raiz, d))];
  const dirs = ["tests", "test", "spec", "__tests__", "src/tests", "src/__tests__"];
  if (bases.some((b) => dirs.some((d) => existsSync(join(b, d))))) return true;
  return bases.some((b) => {
    try {
      return readdirSync(b).some((f) => PATRONES_TEST.some((p) => p.test(f)));
    } catch {
      return false;
    }
  });
}

export function tieneCI(raiz: string): boolean {
  try {
    const d = join(raiz, ".github", "workflows");
    return existsSync(d) && readdirSync(d).some((f) => /\.ya?ml$/.test(f));
  } catch {
    return false;
  }
}

/* ────────────────────────────────────────────────────────────────
 * Clasificación de tier — el gate es un criterio, no un proceso.
 *
 * El Lead NO juzga el tier: llama a `clasificarTier` y usa lo que
 * devuelva. Bajar de tier exige justificación escrita, y la función
 * devuelve siempre el motivo, así la excepción queda a la vista.
 *
 * Los patrones usan substring a propósito: ante la duda se escala.
 * Sobre-escalar cuesta un subagente; sub-escalar cuesta un bug.
 * ──────────────────────────────────────────────────────────────── */

export type Tier = 0 | 1 | 2 | 3;

/** Build, empaquetado y dependencias: tocar esto nunca es "un cambio chico". */
export const PATRONES_CONFIG = [
  "package.json",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lock",
  "tsconfig",
  "jsconfig",
  "vite.config",
  "webpack.config",
  "rollup.config",
  "esbuild",
  "babel.config",
  "next.config",
  "nuxt.config",
  "svelte.config",
  "astro.config",
  "tailwind.config",
  "postcss.config",
  "pyproject.toml",
  "setup.py",
  "setup.cfg",
  "requirements",
  "pipfile",
  "poetry.lock",
  "cargo.toml",
  "cargo.lock",
  "go.mod",
  "go.sum",
  "pom.xml",
  "build.gradle",
  "makefile",
  "gemfile",
  "composer.json",
];

/** Infra y entrega: CI, contenedores, despliegue, IaC. */
export const PATRONES_INFRA = [
  ".github/",
  ".gitlab-ci",
  ".circleci/",
  "jenkinsfile",
  "dockerfile",
  "docker-compose",
  ".dockerignore",
  "k8s/",
  "kubernetes/",
  "helm/",
  "terraform/",
  ".tf",
  "ansible/",
  "playbook",
  "deploy",
  "vercel.json",
  "netlify.toml",
  "fly.toml",
  "serverless.yml",
];

/** Lógica crítica: auth, datos sensibles, pagos, secretos. Siempre tier 3. */
export const PATRONES_CRITICO = [
  "auth",
  "login",
  "logout",
  "session",
  "password",
  "credential",
  "secret",
  "token",
  "permission",
  "role",
  "payment",
  "checkout",
  "billing",
  "invoice",
  "crypto",
  "encrypt",
  "migration",
  "schema",
  "database",
];

function normalizar(p: string): string {
  return p.replace(/\\/g, "/").toLowerCase();
}

/**
 * ¿El archivo cae en alguna categoría sensible?
 *
 * Devuelve las categorías que matchean. `null` = inocuo.
 */
export function clasificarRuta(path: string): {
  config: boolean;
  infra: boolean;
  critico: boolean;
} {
  const p = normalizar(path);
  const base = p.slice(p.lastIndexOf("/") + 1);
  return {
    config: PATRONES_CONFIG.some((x) => base.startsWith(x) || p.includes(`/${x}`)),
    infra: PATRONES_INFRA.some((x) => p.includes(x)),
    critico: PATRONES_CRITICO.some((x) => p.includes(x)),
  };
}

export interface EntradaTier {
  /** Archivos que el ticket va a tocar. */
  archivos: string[];
  /** Toca archivos de config/build/empaquetado/dependencias. */
  config?: boolean;
  /** Toca CI, contenedores, despliegue o IaC. */
  infra?: boolean;
  /** El propio ticket se declara crítico (auth, pagos, datos...). */
  critico?: boolean;
}

export interface ResultadoTier {
  tier: Tier;
  ruta: string;
  gates: string[];
  motivo: string;
}

/**
 * Devuelve el **menor** tier que cubre el cambio y por qué.
 *
 * Prioridad: crítico > infra > config > cantidad de archivos.
 */
export function clasificarTier(e: EntradaTier): ResultadoTier {
  const archivos = e.archivos ?? [];
  const criticos = archivos.filter((f) => clasificarRuta(f).critico);
  const hayConfig = e.config === true || archivos.some((f) => clasificarRuta(f).config);
  const hayInfra = e.infra === true || archivos.some((f) => clasificarRuta(f).infra);
  const critico = e.critico === true || criticos.length > 0;
  const n = archivos.length;

  const mk = (tier: Tier, motivo: string): ResultadoTier => ({
    tier,
    ruta:
      tier === 0
        ? "Dev → Lead"
        : tier === 1
          ? "Dev → Reviewer"
          : "Architect → Dev → Reviewer → QA",
    gates:
      tier === 0
        ? ["evidencia de tests en el ticket"]
        : tier === 1
          ? ["review de diff"]
          : ["review sin bloqueantes", "QA con evidencia"],
    motivo,
  });

  if (critico) {
    return mk(3, `lógica crítica${criticos.length ? ` (${criticos[0]})` : ""}`);
  }
  if (hayInfra) return mk(2, "toca infra/CI/deploy");
  if (hayConfig) return mk(2, "toca config/build/empaquetado");
  if (n === 0) return mk(0, "sin archivos declarados");
  if (n === 1) return mk(0, "1 archivo, sin config ni infra");
  if (n <= 3) return mk(1, `${n} archivos, sin config ni infra`);
  return mk(2, `${n} archivos (>3)`);
}
