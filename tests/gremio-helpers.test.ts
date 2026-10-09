import { describe, it, expect, afterAll } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { execSync } from "node:child_process";
import {
  coincideMarca,
  detectarWeb,
  tieneTests,
  tieneCI,
  leerHerramientas,
  leerRama,
  leerRemoto,
  tieneCommits,
  clasificarRuta,
  clasificarTier,
} from "../.opencode/lib/gremio-helpers";

const temporales: string[] = [];

function crear(estructura: Record<string, string | true>): string {
  const raiz = mkdtempSync(join(tmpdir(), "gremio-helpers-"));
  temporales.push(raiz);
  for (const [ruta, contenido] of Object.entries(estructura)) {
    const destino = join(raiz, ruta);
    if (contenido === true) {
      mkdirSync(destino, { recursive: true });
      continue;
    }
    mkdirSync(dirname(destino), { recursive: true });
    writeFileSync(destino, contenido, "utf-8");
  }
  return raiz;
}

function pkg(deps: Record<string, string>): string {
  return JSON.stringify({ devDependencies: deps });
}

afterAll(() => {
  for (const t of temporales) rmSync(t, { recursive: true, force: true });
});

describe("coincideMarca (match preciso)", () => {
  it("no confunde vitest con vite (regresión)", () => {
    expect(coincideMarca("vitest", "vite")).toBe(false);
  });
  it("no confunde preact con react", () => {
    expect(coincideMarca("preact", "react")).toBe(false);
  });
  it("matchea el nombre exacto", () => {
    expect(coincideMarca("vite", "vite")).toBe(true);
    expect(coincideMarca("react", "react")).toBe(true);
  });
  it("matchea el prefijo con guion", () => {
    expect(coincideMarca("vite-plugin-x", "vite")).toBe(true);
    expect(coincideMarca("react-dom", "react")).toBe(true);
    expect(coincideMarca("next-auth", "next")).toBe(true);
  });
  it("matchea el scope @marca/", () => {
    expect(coincideMarca("@vue/core", "vue")).toBe(true);
    expect(coincideMarca("@angular/core", "angular")).toBe(true);
  });
  it("matchea scopes alternativos declarados", () => {
    expect(coincideMarca("@vitejs/plugin-react", "vite")).toBe(true);
    expect(coincideMarca("@remix-run/react", "remix")).toBe(true);
    expect(coincideMarca("@sveltejs/kit", "svelte")).toBe(true);
    expect(coincideMarca("@astrojs/react", "astro")).toBe(true);
    expect(coincideMarca("@solidjs/router", "solid-js")).toBe(true);
  });
});

describe("detectarWeb", () => {
  it("vitest solo → NO es web app (regresión)", () => {
    const raiz = crear({ "package.json": pkg({ vitest: "^5.0.1" }) });
    const r = detectarWeb(raiz);
    expect(r.es).toBe(false);
    expect(r.stack).toEqual([]);
    expect(r.senales).toEqual([]);
  });
  it("vitest + coverage → NO es web app", () => {
    const raiz = crear({ "package.json": pkg({ vitest: "^5", "@vitest/coverage-v8": "^5" }) });
    expect(detectarWeb(raiz).es).toBe(false);
  });
  it("react + react-dom → web app con stack react", () => {
    const raiz = crear({ "package.json": pkg({ react: "^19", "react-dom": "^19" }) });
    const r = detectarWeb(raiz);
    expect(r.es).toBe(true);
    expect(r.stack).toContain("react");
  });
  it("next → web app", () => {
    const raiz = crear({ "package.json": pkg({ next: "^15" }) });
    expect(detectarWeb(raiz).es).toBe(true);
  });
  it("dependencies comunes (no solo devDependencies)", () => {
    const raiz = crear({ "package.json": JSON.stringify({ dependencies: { vue: "^3" } }) });
    expect(detectarWeb(raiz).es).toBe(true);
  });
  it("solo @remix-run/react → web app (scope alternativo)", () => {
    const raiz = crear({ "package.json": pkg({ "@remix-run/react": "^2" }) });
    const r = detectarWeb(raiz);
    expect(r.es).toBe(true);
    expect(r.stack).toContain("remix");
  });
  it("sin package.json pero con index.html → web app", () => {
    const raiz = crear({ "index.html": "<html></html>" });
    expect(detectarWeb(raiz).es).toBe(true);
  });
  it("proyecto vacío → no es web app", () => {
    expect(detectarWeb(crear({})).es).toBe(false);
  });
  it("package.json inválido → no lanza y no es web app", () => {
    const raiz = crear({ "package.json": "{ roto" });
    expect(detectarWeb(raiz).es).toBe(false);
  });
  it("app/package.json con react (app en carpeta hermana) → web app", () => {
    const raiz = crear({ "app/package.json": pkg({ react: "^19" }) });
    const r = detectarWeb(raiz);
    expect(r.es).toBe(true);
    expect(r.stack).toContain("react");
    expect(r.senales.some((s) => s.startsWith("app/package.json"))).toBe(true);
  });
  it("raíz con vitest + app/ con react → web app por react, no por vite", () => {
    const raiz = crear({
      "package.json": pkg({ vitest: "^5" }),
      "app/package.json": pkg({ react: "^19" }),
    });
    const r = detectarWeb(raiz);
    expect(r.es).toBe(true);
    expect(r.stack).toEqual(["react"]);
  });
  it("app/ con index.html → web app", () => {
    const raiz = crear({ "app/index.html": "<html></html>" });
    expect(detectarWeb(raiz).es).toBe(true);
  });
});

describe("tieneTests", () => {
  it("carpeta tests/", () => {
    expect(tieneTests(crear({ "tests/": true }))).toBe(true);
  });
  it("archivo test_*.py en la raíz", () => {
    expect(tieneTests(crear({ "test_algo.py": "x" }))).toBe(true);
  });
  it("archivo *.test.ts en la raíz", () => {
    expect(tieneTests(crear({ "algo.test.ts": "x" }))).toBe(true);
  });
  it("sin tests → false", () => {
    expect(tieneTests(crear({ "README.md": "x" }))).toBe(false);
  });
  it("carpeta app/tests/ (app en carpeta hermana)", () => {
    expect(tieneTests(crear({ "app/tests/": true }))).toBe(true);
  });
  it("archivo app/test_x.py", () => {
    expect(tieneTests(crear({ "app/test_x.py": "x" }))).toBe(true);
  });
});

describe("tieneCI", () => {
  it("workflow en .github/workflows → true", () => {
    const raiz = crear({ ".github/workflows/ci.yml": "on: [push]" });
    expect(tieneCI(raiz)).toBe(true);
  });
  it("sin workflows → false", () => {
    expect(tieneCI(crear({ "README.md": "x" }))).toBe(false);
  });
});

describe("leerHerramientas", () => {
  it("lee enabled del opencode.json", () => {
    const raiz = crear({
      "opencode.json": JSON.stringify({
        mcp: { "chrome-devtools": { enabled: false }, context7: { enabled: true } },
      }),
    });
    expect(leerHerramientas(raiz)).toEqual({ "chrome-devtools": false, context7: true });
  });
  it("lee configuración V2 con mcp.servers y disabled", () => {
    const raiz = crear({
      "opencode.json": JSON.stringify({
        mcp: {
          servers: {
            context7: { disabled: false },
            playwright: { disabled: true },
          },
        },
      }),
    });
    expect(leerHerramientas(raiz)).toEqual({ context7: true, playwright: false });
  });
  it("sin opencode.json → null", () => {
    expect(leerHerramientas(crear({}))).toBeNull();
  });
});

describe("git (rama, remoto, commits)", () => {
  it("lee rama y commits de un repo real, y remoto null si no hay", () => {
    const raiz = crear({ "README.md": "x" });
    execSync("git init -q -b main", { cwd: raiz });
    execSync("git add -A", { cwd: raiz });
    execSync('git -c user.email=t@t.t -c user.name=t commit -q -m init', { cwd: raiz });
    const gitDir = join(raiz, ".git");
    expect(leerRama(gitDir)).toBe("main");
    expect(tieneCommits(gitDir, "main")).toBe(true);
    expect(leerRemoto(gitDir)).toBeNull();
  });
});

describe("clasificarRuta (que rutas son sensibles)", () => {
  it("archivo de aplicacion comun -> inocuo", () => {
    expect(clasificarRuta("src/components/Boton.tsx")).toEqual({
      config: false,
      infra: false,
      critico: false,
    });
  });

  it("detecta config/build por nombre de archivo", () => {
    expect(clasificarRuta("package.json").config).toBe(true);
    expect(clasificarRuta("tsconfig.json").config).toBe(true);
    expect(clasificarRuta("pyproject.toml").config).toBe(true);
    expect(clasificarRuta("Dockerfile").infra).toBe(true);
  });

  it("detecta infra por carpeta", () => {
    expect(clasificarRuta(".github/workflows/ci.yml").infra).toBe(true);
    expect(clasificarRuta("infra/main.tf").infra).toBe(true);
  });

  it("detecta logica critica por substring", () => {
    expect(clasificarRuta("src/auth/login.ts").critico).toBe(true);
    expect(clasificarRuta("app/checkout/total.ts").critico).toBe(true);
    expect(clasificarRuta("src/db/schema.sql").critico).toBe(true);
  });

  it("normaliza separadores de Windows", () => {
    expect(clasificarRuta("src\\auth\\session.ts").critico).toBe(true);
  });
});

describe("clasificarTier (el Lead no juzga: la funcion decide)", () => {
  it("1 archivo inocuo -> tier 0, ruta Dev -> Lead", () => {
    const r = clasificarTier({ archivos: ["src/Boton.tsx"] });
    expect(r.tier).toBe(0);
    expect(r.ruta).toBe("Dev → Lead");
    expect(r.gates).toEqual(["evidencia de tests en el ticket"]);
  });

  it("2-3 archivos inocuos -> tier 1 con Reviewer", () => {
    const r = clasificarTier({ archivos: ["src/a.ts", "src/b.ts"] });
    expect(r.tier).toBe(1);
    expect(r.ruta).toBe("Dev → Reviewer");
  });

  it("mas de 3 archivos -> tier 2 con ruta completa", () => {
    const r = clasificarTier({ archivos: ["a.ts", "b.ts", "c.ts", "d.ts"] });
    expect(r.tier).toBe(2);
    expect(r.ruta).toBe("Architect → Dev → Reviewer → QA");
  });

  it("un solo archivo de config -> tier 2 (no es un cambio chico)", () => {
    expect(clasificarTier({ archivos: ["package.json"] }).tier).toBe(2);
    expect(clasificarTier({ archivos: ["tsconfig.json"] }).tier).toBe(2);
  });

  it("un solo archivo de CI -> tier 2", () => {
    expect(clasificarTier({ archivos: [".github/workflows/ci.yml"] }).tier).toBe(2);
  });

  it("logica critica -> tier 3 aunque sea un archivo", () => {
    const r = clasificarTier({ archivos: ["src/auth/session.ts"] });
    expect(r.tier).toBe(3);
    expect(r.motivo).toContain("crítica");
  });

  it("el flag critico sube a tier 3 sin tocar paths", () => {
    expect(clasificarTier({ archivos: ["src/util.ts"], critico: true }).tier).toBe(3);
  });

  it("critico gana sobre infra y config", () => {
    const r = clasificarTier({ archivos: ["package.json"], config: true, infra: true, critico: true });
    expect(r.tier).toBe(3);
  });

  it("infra gana sobre config", () => {
    expect(clasificarTier({ archivos: ["package.json"], config: true, infra: true }).tier).toBe(2);
  });

  it("siempre devuelve motivo (la excepcion queda a la vista)", () => {
    for (const archivos of [[], ["a.ts"], ["a.ts", "b.ts"], ["package.json"]]) {
      expect(clasificarTier({ archivos }).motivo.length).toBeGreaterThan(0);
    }
  });
});
