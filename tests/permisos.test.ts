import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Contrato de permisos del Gremio 2 para OpenCode **v2**.
 *
 * En v2 los permisos son un ARRAY de {action, resource, effect}, no un objeto
 * `permission:`. Acciones v2: `shell` (antes `bash`), `subagent` (antes `task`).
 * Gana la última regla que matchea.
 *
 * El README promete que un cambio accidental en un allowlist no pueda abrir un
 * agujero silencioso. Estos tests leen el frontmatter real y fallan si una
 * invariante se rompe.
 */

const DIR = join(process.cwd(), ".opencode", "agents");
const SUBAGENTES = ["architect", "dev", "reviewer", "qa", "devops"] as const;
const TODOS = ["lead", ...SUBAGENTES] as const;

type Regla = { action: string; resource: string; effect: string };

function reglas(agente: string): Regla[] {
  const raw = readFileSync(join(DIR, `${agente}.md`), "utf-8");
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) throw new Error(`${agente}.md no tiene frontmatter`);
  const lineas = m[1].split(/\r?\n/);
  const valor = (l: string) => l.split(":").slice(1).join(":").trim().replace(/^'(.*)'$/, "$1");

  const out: Regla[] = [];
  let actual: Partial<Regla> | null = null;
  let dentro = false;
  for (const l of lineas) {
    if (/^permissions:\s*$/.test(l)) {
      dentro = true;
      continue;
    }
    if (!dentro) continue;
    if (/^\S/.test(l)) break; // salio del bloque permissions
    if (/^\s*-\s*action:/.test(l)) {
      if (actual?.action) out.push(actual as Regla);
      actual = { action: valor(l.replace(/^\s*-\s*/, "")) };
    } else if (actual && /^\s*resource:/.test(l)) {
      actual.resource = valor(l);
    } else if (actual && /^\s*effect:/.test(l)) {
      actual.effect = valor(l);
    }
  }
  if (actual?.action) out.push(actual as Regla);
  return out;
}

const de = (a: string, accion: string) => reglas(a).filter((r) => r.action === accion);
const efecto = (a: string, accion: string, recurso: string) =>
  reglas(a).find((r) => r.action === accion && r.resource === recurso)?.effect;

describe("OpenCode v2 — formato de permisos", () => {
  it("todos los agentes declaran permissions como array", () => {
    for (const a of TODOS) {
      const r = reglas(a);
      expect(r.length, `${a} sin reglas`).toBeGreaterThan(0);
      for (const x of r) {
        expect(typeof x.action).toBe("string");
        expect(typeof x.resource).toBe("string");
        expect(["allow", "deny", "ask"]).toContain(x.effect);
      }
    }
  });

  it("nadie usa los nombres de acción de v1 (bash/task)", () => {
    for (const a of TODOS) {
      const acciones = reglas(a).map((r) => r.action);
      expect(acciones, `${a} usa bash (v1)`).not.toContain("bash");
      expect(acciones, `${a} usa task (v1)`).not.toContain("task");
    }
  });

  it("cada rol con shell arranca con catch-all deny", () => {
    for (const a of TODOS) {
      const shell = de(a, "shell");
      if (shell.length === 0) continue;
      expect(shell[0].resource, `${a} no arranca con "*" deny`).toBe("*");
      expect(shell[0].effect).toBe("deny");
    }
  });
});

describe("topología de estrella", () => {
  it("todo subagente tiene subagent deny y solo el Lead delega", () => {
    for (const a of SUBAGENTES) {
      expect(efecto(a, "subagent", "*"), `${a} puede lanzar subagentes`).toBe("deny");
    }
    expect(efecto("lead", "subagent", "*")).toBe("deny");
    for (const r of ["architect", "dev", "reviewer", "qa", "devops"]) {
      expect(efecto("lead", "subagent", r), `Lead no puede delegar a ${r}`).toBe("allow");
    }
  });

  it("solo el Lead puede preguntar al usuario", () => {
    expect(efecto("lead", "question", "*")).toBe("allow");
    for (const a of SUBAGENTES) {
      expect(efecto(a, "question", "*"), `${a} pregunta directo`).toBe("deny");
    }
  });
});

describe("allowlist de shell", () => {
  it("el Reviewer no puede escribir código ni commitear", () => {
    const shell = de("reviewer", "shell").map((r) => r.resource);
    expect(shell.some((r) => r.startsWith("git add"))).toBe(false);
    expect(shell.some((r) => r.startsWith("git commit"))).toBe(false);
    expect(efecto("reviewer", "edit", "*")).toBe("deny");
  });

  it("Dev commitea local pero nunca pushea", () => {
    expect(efecto("dev", "shell", "git add *")).toBe("allow");
    expect(efecto("dev", "shell", "git commit *")).toBe("allow");
    expect(efecto("dev", "shell", "git push *")).toBe("deny");
  });

  it("DevOps pide aprobación para publicar y veta el force-push", () => {
    expect(efecto("devops", "shell", "git push *")).toBe("ask");
    expect(efecto("devops", "shell", "git push --force *")).toBe("deny");
    expect(efecto("devops", "shell", "gh pr create *")).toBe("ask");
    expect(efecto("devops", "shell", "gh repo create *")).toBe("ask");
  });

  it("nadie redirige, borra ni escala privilegios", () => {
    for (const a of TODOS) {
      const shell = de(a, "shell");
      // Architect solo tiene el catch-all deny: no hay allowlist que auditar.
      if (shell.length <= 1) continue;
      const res = shell.map((r) => r.resource);
      expect(res, `${a} permite redirección`).toContain("*> *");
      expect(res, `${a} permite rm`).toContain("rm *");
      expect(res, `${a} permite sudo`).toContain("sudo *");
    }
  });

  it("el Lead tiene shell de solo lectura: ve el diff, no commitea", () => {
    const res = de("lead", "shell").map((r) => r.resource);
    expect(res).toContain("git diff *");
    expect(res).toContain("git status *");
    expect(res.some((r) => r.startsWith("git add"))).toBe(false);
    expect(res.some((r) => r.startsWith("git commit"))).toBe(false);
    expect(res.some((r) => r.startsWith("npm test"))).toBe(false);
  });

  it("el Architect no corre comandos", () => {
    expect(de("architect", "shell")).toEqual([{ action: "shell", resource: "*", effect: "deny" }]);
  });
});

describe("entorno vs proyecto", () => {
  it("Dev y QA no pueden editar el entorno del Gremio", () => {
    for (const a of ["dev", "qa"] as const) {
      expect(efecto(a, "edit", ".opencode/*"), `${a} edita .opencode/`).toBe("deny");
      expect(efecto(a, "edit", "*AGENTS.md")).toBe("deny");
      expect(efecto(a, "edit", "*opencode.json")).toBe("deny");
    }
  });

  it("solo DevOps puede tocar opencode.json (excepción controlada)", () => {
    const devops = de("devops", "edit").map((r) => r.resource);
    expect(devops.some((r) => r.includes("opencode.json"))).toBe(false);
    expect(de("devops", "edit").some((r) => r.resource === "*" && r.effect === "allow")).toBe(true);
  });

  it("el Lead solo escribe en board/", () => {
    expect(efecto("lead", "edit", "*")).toBe("deny");
    expect(efecto("lead", "edit", "board/*")).toBe("allow");
  });
});

describe("habilidades por rol", () => {
  it("cada rol solo ve sus propias skills", () => {
    const permitidas = (a: string) =>
      de(a, "skill").filter((r) => r.effect === "allow").map((r) => r.resource);
    expect(permitidas("qa")).toEqual(["test-and-verify"]);
    expect(permitidas("reviewer").sort()).toEqual(["code-review", "git-workflow"]);
    expect(permitidas("dev")).not.toContain("ship"); // ship es de DevOps
    expect(permitidas("devops")).toContain("ship");
    for (const a of SUBAGENTES) {
      expect(efecto(a, "skill", "*"), `${a} ve todas las skills`).toBe("deny");
    }
  });

  it("QA es el único rol con navegador", () => {
    expect(efecto("qa", "playwright_*", "*")).toBe("allow");
    expect(efecto("qa", "chrome-devtools_*", "*")).toBe("allow");
    for (const a of ["lead", "architect", "dev", "reviewer", "devops"] as const) {
      const r = de(a, "playwright_*").find((x) => x.effect === "allow");
      expect(r, `${a} tiene playwright`).toBeUndefined();
    }
  });

  it("solo Lead y DevOps ven la tool de estado; ningún subagente la invoca", () => {
    for (const a of SUBAGENTES) {
      const r = de(a, "gremio_estado").find((x) => x.effect === "allow");
      expect(r, `${a} puede llamar gloomy_estado`).toBeUndefined();
    }
  });
});