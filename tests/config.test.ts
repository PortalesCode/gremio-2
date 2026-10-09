import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Contrato de opencode.json para OpenCode v2.
 *
 * El modo de falla más caro de todos es silencioso: si el paquete vuelve al
 * formato v1, los agentes corren SIN límites y los MCPs pesados arrancan sin
 * avisar. Estos tests son la red.
 */

const CFG = join(process.cwd(), "opencode.json");
const cfg = JSON.parse(readFileSync(CFG, "utf-8"));

const servers = (): Record<string, Record<string, unknown>> => cfg.mcp?.servers ?? {};

describe("opencode.json — MCPs en formato v2", () => {
  it("los servidores viven bajo mcp.servers, no planos bajo mcp", () => {
    expect(Object.keys(cfg.mcp)).toContain("servers");
    for (const clave of Object.keys(cfg.mcp)) {
      if (clave === "servers" || clave === "timeout" || clave === "experimental") continue;
      throw new Error(`MCP "${clave}" suelto bajo mcp: en v2 debe ir en mcp.servers`);
    }
  });

  it("ningún servidor usa 'enabled' (v1): se usa 'disabled'", () => {
    for (const [k, v] of Object.entries(servers())) {
      expect(v, `${k} usa "enabled" (v1, ignorado en v2)`).not.toHaveProperty("enabled");
    }
  });

  it("los 4 pesados vienen apagados por defecto", () => {
    for (const k of ["chrome-devtools", "playwright", "markitdown", "headroom"]) {
      expect(servers()[k], `${k} debería venir apagado`).toBeDefined();
      expect(servers()[k].disabled, `${k} debería venir apagado`).toBe(true);
    }
  });

  it("los 3 livianos vienen encendidos", () => {
    for (const k of ["context7", "codegraph", "sequential-thinking"]) {
      expect(servers()[k].disabled ?? false, `${k} debería venir encendido`).toBe(false);
    }
  });

  it("markitdown no apunta a la versión rota por pydantic", () => {
    // markitdown-mcp@0.0.1a4 importa eval_type_backport, que pydantic >=2.12
    // ya no expone: el proceso moría al arrancar.
    const cmd = String(servers().markitdown.command);
    expect(cmd).not.toContain("0.0.1a4");
    expect(cmd).toContain("markitdown-mcp@latest");
  });
});

describe("opencode.json — permisos y runtime", () => {
  it("no usa el objeto permission: de v1", () => {
    expect(cfg).not.toHaveProperty("permission");
  });

  it("permissions es un array v2 válido", () => {
    expect(Array.isArray(cfg.permissions)).toBe(true);
    for (const r of cfg.permissions) {
      expect(Object.keys(r).sort()).toEqual(["action", "effect", "resource"]);
      expect(["allow", "ask", "deny"]).toContain(r.effect);
    }
  });

  it("Playwright y DevTools denegados por defecto (solo QA los habilita)", () => {
    const acciones = cfg.permissions.map((r: { action: string }) => r.action);
    expect(acciones).toContain("playwright_*");
    expect(acciones).toContain("chrome-devtools_*");
  });

  it("arranca en el Lead y con la topología de estrella", () => {
    expect(cfg.default_agent).toBe("lead");
    expect(cfg.subagent_depth).toBe(1);
  });
});