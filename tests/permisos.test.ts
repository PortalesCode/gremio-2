import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Contrato de permisos del Gremio 2.
 *
 * El README promete que un cambio accidental en un allowlist no pueda
 * abrir un agujero silencioso. Estos tests leen el frontmatter real de los
 * agentes y fallan si una invariante se rompe.
 *
 * No dependen de un parser de YAML: el frontmatter es plano y regular.
 */

const DIR = join(process.cwd(), ".opencode", "agents");

const SUBAGENTES = ["architect", "dev", "reviewer", "qa", "devops"] as const;
const TODOS = ["lead", ...SUBAGENTES] as const;

function frontmatter(agente: string): string {
  const raw = readFileSync(join(DIR, `${agente}.md`), "utf-8");
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) throw new Error(`${agente}.md no tiene frontmatter`);
  return m[1];
}

/** Líneas de una clave del frontmatter. Si la clave tiene valor plano, devuelve ese valor. */
function seccion(fm: string, clave: string): string[] {
  const lineas = fm.split(/\r?\n/);
  const out: string[] = [];
  let dentro = false;
  let indentBase = 0;

  for (const l of lineas) {
    if (!dentro) {
      const re = new RegExp(`^(\\s*)${clave}:(.*)$`);
      const m = l.match(re);
      if (!m) continue;
      dentro = true;
      indentBase = m[1].length;
      const valor = m[2].trim();
      if (valor) out.push(`${clave}: ${valor}`);
      continue;
    }
    const ind = (l.match(/^\s*/) ?? [""])[0].length;
    if (l.trim() && ind <= indentBase) break;
    if (l.trim()) out.push(l.trim());
  }
  return out;
}

function reglas(fm: string, clave: string): string[] {
  return seccion(fm, clave).filter((l) => l.includes(":"));
}

/** Reglas de bash, o lista vacía si la clave tiene un valor plano (`bash: deny`). */
function bashAllowlist(fm: string): string[] {
  const b = seccion(fm, "bash");
  return b[0] === "bash: deny" ? [] : b;
}

describe("contrato de permisos — invariantes globales", () => {
  it("todo subagente tiene task: deny (topología de estrella)", () => {
    for (const a of SUBAGENTES) {
      expect(seccion(frontmatter(a), "task")).toContain("task: deny");
    }
  });

  it("solo el Lead puede preguntar al usuario", () => {
    expect(seccion(frontmatter("lead"), "question")).toContain("question: allow");
    for (const a of SUBAGENTES) {
      expect(seccion(frontmatter(a), "question")).toContain("question: deny");
    }
  });

  it("todo rol con bash usa allowlist con catch-all deny", () => {
    for (const a of TODOS) {
      const b = bashAllowlist(frontmatter(a));
      // Architect lo tiene plano a deny; el resto debe arrancar con "*": deny.
      if (b.length === 0) continue;
      expect(b, `${a} debe arrancar bash con "*": deny`).toContain('"*": deny');
    }
  });

  it("nadie tiene bash: allow plano (sería un agujero)", () => {
    for (const a of TODOS) {
      expect(seccion(frontmatter(a), "bash")).not.toContain("bash: allow");
    }
  });

  it("el Reviewer no puede escribir código ni commiterar", () => {
    const fm = frontmatter("reviewer");
    expect(reglas(fm, "edit")).toContain('"*": deny');
    const bash = reglas(fm, "bash");
    expect(bash.some((l) => l.startsWith('"git add'))).toBe(false);
    expect(bash.some((l) => l.startsWith('"git commit'))).toBe(false);
  });

  it("Dev puede commitear local pero nunca pushear", () => {
    const bash = reglas(frontmatter("dev"), "bash");
    expect(bash).toContain('"git add*": allow');
    expect(bash).toContain('"git commit*": allow');
    expect(bash).toContain('"git push*": deny');
  });

  it("DevOps pide aprobación (ask) para publicar, y veta el force-push", () => {
    const bash = reglas(frontmatter("devops"), "bash");
    expect(bash).toContain('"git push*": ask');
    expect(bash).toContain('"git push --force*": deny');
    expect(bash).toContain('"gh pr create*": ask');
    expect(bash).toContain('"gh repo create*": ask');
  });

  it("ningún rol shell puede redirigir, borrar ni escalar privilegios", () => {
    for (const a of TODOS) {
      const bash = bashAllowlist(frontmatter(a));
      if (bash.length === 0) continue; // Architect: bash plano deny
      expect(bash, `${a} no debe permitir redirección`).toContain('"*> *": deny');
      expect(bash, `${a} no debe permitir rm`).toContain('"rm*": deny');
      expect(bash, `${a} no debe permitir sudo`).toContain('"sudo*": deny');
    }
  });

  it("Dev y QA no pueden editar el entorno del Gremio", () => {
    for (const a of ["dev", "qa"] as const) {
      const edit = reglas(frontmatter(a), "edit");
      expect(edit).toContain('"*.opencode/*": deny');
      expect(edit).toContain('"*AGENTS.md": deny');
      expect(edit).toContain('"*opencode.json": deny');
    }
  });

  it("solo DevOps puede tocar opencode.json (excepción controlada)", () => {
    const devops = reglas(frontmatter("devops"), "edit");
    expect(devops.some((l) => l.includes("opencode.json"))).toBe(false);
    expect(seccion(frontmatter("devops"), "edit").length).toBeGreaterThan(0);
  });

  it("el Lead solo escribe en board/", () => {
    const edit = reglas(frontmatter("lead"), "edit");
    expect(edit).toContain('"*": deny');
    expect(edit).toContain('"*board/*": allow');
  });

  it("el Lead tiene bash de solo lectura: ve el diff, no commitea", () => {
    const bash = reglas(frontmatter("lead"), "bash");
    expect(bash).toContain('"git diff*": allow');
    expect(bash).toContain('"git status*": allow');
    expect(bash.some((l) => l.startsWith('"git add'))).toBe(false);
    expect(bash.some((l) => l.startsWith('"git commit'))).toBe(false);
    expect(bash.some((l) => l.startsWith('"npm test'))).toBe(false);
  });

  it("el Architect no corre comandos", () => {
    expect(seccion(frontmatter("architect"), "bash")).toEqual(["bash: deny"]);
  });

  it("QA es el único rol con navegador", () => {
    const qa = frontmatter("qa");
    expect(qa).toContain('"playwright*": allow');
    for (const a of ["lead", "architect", "dev", "reviewer", "devops"] as const) {
      expect(frontmatter(a)).not.toContain('"playwright*": allow');
    }
  });
});