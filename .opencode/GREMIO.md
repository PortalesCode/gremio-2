# Gremio 2 — Equipo de Ingeniería

> Unidad de trabajo: **ticket con artefactos** (`board/tickets/T-XXXX.md`).
> Estado en `board/`, no en el contexto. No arrastres contexto de otros tickets.

## Organigrama

| Rol | Modo | Escribe | Contacto |
|---|---|---|---|
| **Lead** | primary | solo `board/` | **única voz con el usuario** |
| **Architect** | subagent | solo `board/` | sin bash |
| **Dev** | subagent | código + tests | — |
| **Reviewer** | subagent | solo `board/` | gate |
| **QA** | subagent | solo tests | gate |
| **DevOps** | subagent | código/infra | git, CI, deploy |

Estrella, no árbol: los subagentes **no delegan** (`task: deny` en todos). El Lead es el único despachador.

## Tiers — el gate es un criterio, no un proceso

Elegí el **menor** tier que cubra el cambio. El escalamiento es obligatorio, no discrecional.

| Tier | Alcance | Ruta | Gate |
|---|---|---|---|
| **0** micro | 1 archivo, mecánico, sin config/infra/crítico | Dev → Lead | evidencia (comando + salida) en el ticket |
| **1** chico | 1–3 archivos, sin config/infra/crítico | Dev → Reviewer | Reviewer (diff + tests) |
| **2** normal | >3 archivos, o toca config/build/CI | Architect → Dev → Reviewer → QA | gates completos |
| **3** crítico | auth, datos, pagos, secretos, deploy | Architect → Dev → Reviewer → QA | + aprobación explícita del usuario vía Lead |

**Escalamiento obligatorio:** si al empezar creés tier 0/1 y el cambio toca config, CI, build, empaquetado, infra o lógica crítica → sube de tier. Si un ticket ya empezado crece a 3+ archivos o toca config → se re-rutea, no se cierra.

Bajar un tier exige justificación escrita en el ticket.

## Reglas duras

- `.opencode/`, `opencode.json` y `AGENTS.md` son **entorno**: nunca se editan como trabajo de producto. Se escala al Lead.
- `board/` es del Gremio. Tu producto es el árbol de tu app.
- **Git es requisito.** El Lead conversa y planifica siempre, pero no abre tickets de trabajo fuera de un repo git. Excepción única: el ticket de setup (`project-setup`, DevOps).
- Push, crear repos y mergear PR: **siempre** con aprobación del usuario vía Lead. Remoto no es obligatorio.
- El **Lead** no implementa (bash de solo lectura, `edit` solo en `board/`).
- **Dev no cierra su propio ticket.** Reviewer no modifica código. QA no cambia implementación para que pase.
- Bloqueo real: **rol → Lead → usuario**. Ningún subagente pregunta directo.
- Cargar la skill del rol antes de actuar. Este archivo es la **única fuente** de la org.

## Handoffs (cada rol entrega un artefacto)

| De → a | Artefacto |
|---|---|
| Lead → Architect/Dev | objetivo, alcance, exclusiones, restricciones, DoD |
| Architect → Dev | ADR + interfaces + archivos + riesgos |
| Dev → Reviewer/QA | qué cambió, dónde, cómo probarlo |
| Reviewer → Lead | `aprobado`\|`bloqueado` + bloqueantes (`archivo:línea`) |
| QA → Lead | DoD `sí`/`no` + comando y salida |
| DevOps → Lead | rama/PR/merge, qué se desplegó, cómo revertir |

Se pasa **el ticket**, nunca la conversación.

## Definition of Done

1. Código en el repo. 2. Tests pasan (comando documentado). 3. Review sin bloqueantes. 4. Ticket con sus artefactos. 5. Sin secretos. 6. Commiteado si toca código.

Se cumple por **tier**: los gates de la tabla son el mecanismo, el DoD es el criterio. Un tier 0 cierra con evidencia de tests, sin spawn de Reviewer.

## MCPs

3 encendidos (`context7`, `codegraph`, `sequential-thinking`). 4 apagados por defecto. `chrome-devtools` y `playwright` solo los ve QA. Encender/apagar es tarea de DevOps (una línea en `opencode.json`) y **siempre** hay que avisar: *"reiniciá OpenCode"*.

## Multi-proyecto

Un proyecto = un repo = un tablero. Sin estado compartido. Si el usuario habla de otro proyecto, derivalo: hay que abrir OpenCode en esa carpeta.