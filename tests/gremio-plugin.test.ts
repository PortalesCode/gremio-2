import { describe, expect, it } from "vitest";
import plugin from "../.opencode/plugins/gremio-estado";

type RegisteredTool = {
  name?: string;
  description?: string;
  input?: unknown;
  options?: unknown;
  execute: (input?: unknown) => Promise<{ content: string }>;
};

/** El plugin registra varias tools: las guardamos todas, indexadas por nombre. */
async function registerTools(): Promise<Record<string, RegisteredTool>> {
  const registered: Record<string, RegisteredTool> = {};

  const context = {
    location: { directory: process.cwd() },
    tool: {
      transform: async (callback: (editor: { add: (definition: RegisteredTool) => void }) => void) => {
        callback({
          add(definition) {
            registered[definition.name as string] = definition;
          },
        });
      },
    },
  } as unknown as Parameters<typeof plugin.setup>[0];

  await plugin.setup(context);
  return registered;
}

async function tool(nombre: string): Promise<RegisteredTool> {
  const todas = await registerTools();
  const t = todas[nombre];
  if (!t) throw new Error(`${nombre} no fue registrada`);
  return t;
}

describe("gremio_estado OpenCode 2 plugin", () => {
  it("exports a V2 plugin definition", () => {
    expect(plugin.id).toBe("gremio.estado");
    expect(typeof plugin.setup).toBe("function");
  });

  it("registers both tools through the V2 transform API", async () => {
    const todas = await registerTools();
    expect(Object.keys(todas).sort()).toEqual(["gremio_estado", "gremio_tier"]);
  });

  it("registers the direct tool with no input and codemode off", async () => {
    const t = await tool("gremio_estado");
    expect(t.input).toEqual({
      type: "object",
      properties: {},
      additionalProperties: false,
    });
    expect(t.options).toEqual({ codemode: false });
  });

  it("returns the project state as structured content", async () => {
    const t = await tool("gremio_estado");
    const state = JSON.parse((await t.execute()).content);

    expect(state.raiz).toBe(process.cwd());
    expect(state.es_git).toBe(true);
    expect(state).toHaveProperty("web_app");
    expect(state).toHaveProperty("herramientas");
  });
});

describe("gremio_tier — el Lead no juzga el tier", () => {
  it("un archivo inocuo devuelve tier 0 y la vía corta", async () => {
    const t = await tool("gremio_tier");
    const r = JSON.parse((await t.execute({ archivos: ["src/Boton.tsx"] })).content);

    expect(r.tier).toBe(0);
    expect(r.ruta).toBe("Dev → Lead");
    expect(r.motivo).toBeTruthy();
  });

  it("un archivo de config sube a tier 2", async () => {
    const t = await tool("gremio_tier");
    const r = JSON.parse((await t.execute({ archivos: ["package.json"] })).content);
    expect(r.tier).toBe(2);
  });

  it("acepta los flags config/infra/critico", async () => {
    const t = await tool("gremio_tier");
    expect(JSON.parse((await t.execute({ archivos: ["src/a.ts"], infra: true })).content).tier).toBe(2);
    expect(JSON.parse((await t.execute({ archivos: ["src/a.ts"], critico: true })).content).tier).toBe(3);
  });

  it("no rompe si vienen archivos vacíos o sin el campo", async () => {
    const t = await tool("gremio_tier");
    expect(JSON.parse((await t.execute({ archivos: [] })).content).tier).toBe(0);
    expect(JSON.parse((await t.execute(undefined)).content).tier).toBe(0);
  });
});