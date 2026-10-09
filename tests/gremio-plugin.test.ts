import { describe, expect, it } from "vitest";
import plugin from "../.opencode/plugins/gremio-estado";

type RegisteredTool = {
  name?: string;
  input?: unknown;
  options?: unknown;
  execute: () => Promise<{ content: string }>;
};

async function registerTool(): Promise<RegisteredTool> {
  let registered: RegisteredTool | undefined;

  const context = {
    location: { directory: process.cwd() },
    tool: {
      transform: async (callback: (editor: { add: (definition: RegisteredTool) => void }) => void) => {
        callback({
          add(definition) {
            registered = definition;
          },
        });
      },
    },
  } as unknown as Parameters<typeof plugin.setup>[0];

  await plugin.setup(context);
  if (!registered) throw new Error("gremio_estado no fue registrado");
  return registered;
}

describe("gremio_estado OpenCode 2 plugin", () => {
  it("exports a V2 plugin definition", () => {
    expect(plugin.id).toBe("gremio.estado");
    expect(typeof plugin.setup).toBe("function");
  });

  it("registers the direct tool through the V2 transform API", async () => {
    const registered = await registerTool();

    expect(registered.name).toBe("gremio_estado");
    expect(registered.input).toEqual({
      type: "object",
      properties: {},
      additionalProperties: false,
    });
    expect(registered.options).toEqual({ codemode: false });
  });

  it("returns the project state as structured content", async () => {
    const registered = await registerTool();
    const result = await registered.execute();
    const state = JSON.parse(result.content);

    expect(state.raiz).toBe(process.cwd());
    expect(state.es_git).toBe(true);
    expect(state).toHaveProperty("web_app");
    expect(state).toHaveProperty("herramientas");
  });
});
