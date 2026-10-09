/**
 * gremio-estado.ts — Estado del proyecto y clasificación de tier para el Gremio 2.
 *
 * Expone DOS tools:
 *   - `gremio_estado`: raíz, repo git (rama, remoto, commits), tablero, si es web
 *     app (con match preciso de frameworks), qué herramientas pesadas están
 *     encendidas, y qué base ya tiene el proyecto (tests, CI, README, licencia).
 *   - `gremio_tier`: clasifica un cambio en su tier (0-3) y devuelve ruta,
 *     gates y el motivo. El Lead NO juzga el tier a mano.
 *
 * `gremio_estado` lee `.git/`, `package.json`, marcadores, `opencode.json`
 * y presencia de archivos/carpetas. Además pide a git el RESUMEN de cambios
 * pendientes (archivo + líneas +/-) y los últimos commits, para que el gate
 * del Lead no dependa de un permiso de shell revocable.
 *
 * git se invoca con `execFileSync` (sin shell) y argumentos fijos: no hay
 * interpretación de comandos. Ante cualquier error devuelve lo disponible.
 *
 * La lógica pura vive en `../lib/gremio-helpers` (testeable sin el runtime de
 * OpenCode). Este archivo solo arma las tools.
 */

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "@opencode/plugin";
import {
  leerRama,
  leerRemoto,
  tieneCommits,
  detectarWeb,
  leerHerramientas,
  tieneTests,
  tieneCI,
  clasificarTier,
  leerCambios,
} from "../lib/gremio-helpers";

const DESCRIPTION =
  "Estado del proyecto para el Gremio: raíz, repo git (rama, remoto, commits), tablero, web app, herramientas encendidas, base del proyecto (tests, CI, README, CONTRIBUTING, licencia) y CAMBIOS PENDIENTES con líneas +/-, más los últimos commits. Llamala al arrancar y después de cada entrega: con eso cerrás el gate de tier 0 sin necesidad de correr shell.";

const DESCRIPCION_TIER =
  "Clasifica un cambio en su tier de Gremio 2 (0-3) y devuelve ruta, gates y motivo. No juzgues el tier a mano: pasale los archivos que el ticket va a tocar y usá lo que devuelva. Bajar de tier exige justificación escrita en el ticket.";

export default {
  id: "gremio.estado",
  async setup(ctx) {
    const directory = ctx.location.directory;

    await ctx.tool.transform((tools) => {
      tools.add({
        name: "gremio_estado",
        description: DESCRIPTION,
        input: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        options: {
          codemode: false,
        },
        async execute() {
          const raiz = directory;
          const gitDir = join(raiz, ".git");
          const esGit = existsSync(gitDir);
          const rama = esGit ? leerRama(gitDir) : null;
          const remoto = esGit ? leerRemoto(gitDir) : null;
          const commits = esGit ? tieneCommits(gitDir, rama) : false;

          const tieneBoard = existsSync(join(raiz, "board"));
          let tickets = 0;
          try {
            tickets = readdirSync(join(raiz, "board", "tickets")).filter((f) =>
              /^T-\d+\.md$/.test(f),
            ).length;
          } catch {
            tickets = 0;
          }

          const web = detectarWeb(raiz);
          const herramientas = leerHerramientas(raiz);
          const devtoolsOn = herramientas?.["chrome-devtools"] === true;

          const base = {
            tests: tieneTests(raiz),
            ci: tieneCI(raiz),
            readme: existsSync(join(raiz, "README.md")),
            contributing: existsSync(join(raiz, "CONTRIBUTING.md")),
            licencia: existsSync(join(raiz, "LICENSE")) || existsSync(join(raiz, "LICENSE.md")),
          };

          const cambios = leerCambios(raiz);

          const avisos: string[] = [];
          if (!esGit) {
            avisos.push(
              "NO es un repo git: no abras tickets de trabajo. Podés conversar y planificar. " +
                "Guiá al usuario: (1) correr `git init`, o (2) ticket de setup ejecutado por DevOps.",
            );
          } else if (!commits) {
            avisos.push("Repo git sin commits: el primer commit corresponde al ticket de setup (DevOps).");
          }
          if (web.es && !devtoolsOn) {
            avisos.push(
              "Es una web app y Chrome DevTools está apagado: preguntale al usuario si quiere encenderlo " +
                "para verificación visual (QA). Si acepta, es tarea directa de DevOps; los MCPs se reconectan en caliente, no hace falta reiniciar.",
            );
          }
          if (esGit && commits && !base.tests) {
            avisos.push("No hay tests: ofrecé el ticket de test-setup (Dev).");
          }
          if (esGit && commits && !base.ci) {
            avisos.push("No hay CI: ofrecé el ticket de ci-setup (DevOps) si hay remoto.");
          }
          if (esGit && commits && !remoto) {
            avisos.push("Sin remoto: se trabaja local (rama + commits). El remoto solo hace falta para PR/CI/deploy.");
          }

          return {
            content: JSON.stringify(
              {
                raiz,
                es_git: esGit,
                rama,
                remoto,
                tiene_commits: commits,
                board: tieneBoard ? join(raiz, "board") : null,
                tickets,
                web_app: web.es,
                web_stack: web.stack,
                web_senales: web.senales,
                herramientas,
                base,
                cambios,
                aviso: avisos.length > 0 ? avisos.join(" ") : null,
              },
              null,
              2,
            ),
          };
        },
      });

      tools.add({
        name: "gremio_tier",
        description: DESCRIPCION_TIER,
        input: {
          type: "object",
          properties: {
            archivos: {
              type: "array",
              items: { type: "string" },
              description: "Rutas de los archivos que el ticket va a tocar.",
            },
            config: { type: "boolean", description: "Toca config/build/empaquetado." },
            infra: { type: "boolean", description: "Toca CI, contenedores o despliegue." },
            critico: { type: "boolean", description: "Es lógica crítica (auth, pagos, datos, secretos)." },
          },
          required: ["archivos"],
          additionalProperties: false,
        },
        options: {
          codemode: false,
        },
        async execute(input) {
          const { archivos, config, infra, critico } = (input ?? {}) as {
            archivos?: string[];
            config?: boolean;
            infra?: boolean;
            critico?: boolean;
          };
          return {
            content: JSON.stringify(
              clasificarTier({ archivos: archivos ?? [], config, infra, critico }),
              null,
              2,
            ),
          };
        },
      });
    });
  },
} satisfies Plugin;