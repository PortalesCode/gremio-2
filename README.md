# Gremio 2

**Equipo de ingeniería para OpenCode que no te gasta el contexto ni te fuerza un proceso pesado para un cambio de tres líneas.**

Gremio 2 es la segunda generación de [Gremio](https://github.com/PortalesCode/gremio), el sistema de tickets por artefactos para OpenCode. Misma estructura, misma forma de trabajar —pero con el contexto más chico y con **tiers** que evitan subir un cambio chico por la maquinaria de un cambio grande.

Fan de [Crisol Definitivo](https://github.com/PortalesCode/crisol-definitivo)? No es lo mismo: Crisol te ayuda a **pensar** (túnel de conocimiento, ciclo de skills externas, biblioteca). Gremio te ayuda a **construir**. Gremio 2 es el mismo Gremio, con el presupuesto arreglado.

## El cambio central: el gate es un criterio, no un proceso

En Gremio 1, cualquier cambio que tocara más de dos archivos pasaba por `Architect → Dev → Reviewer → QA`. Eso son cuatro subagentes —cuatro ventanas de contexto enteras— para corregir un typo en un componente.

Gremio 2 clasifica el cambio antes de arrancar:

| Tier | Alcance | Ruta | Gates | Subagentes |
|---|---|---|---|---|
| **0** micro | 1 archivo, mecánico | Dev → Lead | evidencia de tests | **1** |
| **1** chico | 1–3 archivos | Dev → Reviewer | review de diff | **2** |
| **2** normal | >3 archivos, o config/build/CI | Architect → Dev → Reviewer → QA | review + QA | **4** |
| **3** crítico | auth, datos, pagos, secretos, deploy | + aprobación del usuario | todo lo anterior | **4** |

El **DoD es el mismo en todos los tiers**: código commiteado, tests verdes con comando documentado, sin secretos. Lo que cambia es quién verifica, no qué se exige. Un tier 0 no esquiva los tests — los corre y pega la salida en el ticket; el Lead los lee y cierra.

**El Lead no juzga el tier.** Llama a `gremio_tier({ archivos })` y usa lo que le devuelva, con su motivo. La clasificación es una función pura testeada (`.opencode/lib/gremio-helpers.ts`), no una opinión. Bajar el tier devuelto exige justificación escrita en el ticket.

El escalamiento no es discrecional: si empezaste en tier 0 y el cambio toca config, CI o grew a 3+ archivos, se re-rutea. Sobre-escalar cuesta un subagente; sub-escalar cuesta un bug.

## Números reales

Medidos sobre el repo, bytes de los archivos de prompt:

| | Gremio 1 | Gremio 2 | |
|---|---|---|---|
| **Contexto fijo por request** (`GREMIO.md` + Lead) | 11.1 KB | **6.9 KB** | **−38%** |
| `GREMIO.md` (se inyecta en cada request) | 7.6 KB | **3.9 KB** | −49% |
| Lead | 3.5 KB | 3.0 KB | −14% |
| Architect / Reviewer / QA | 1.3–1.5 KB | 1.2–1.9 KB | — |
| **Dev / DevOps** (llevan allowlist de bash) | 1.5 / 2.2 KB | 2.5 / 2.8 KB | **+15%** |

El único renglón que sube es el de los roles que escriben código, y sube a propósito: es el costo de un allowlist real de `bash` en vez de `bash: allow`. Se paga **una vez por spawn**, no en cada request. El contexto fijo —lo que se paga siempre— baja 38%.

## El rediseño de permisos

Gremio 1 tenía un agujero: cuatro de seis roles tenían `bash: allow`, que esquivaba por completo los `deny` de `edit`. Un Reviewer podía no editar código... y editarlo con `sed -i`. La disciplina era prosa, no máquina.

Gremio 2 reemplaza `bash: allow` por un **allowlist con `"*": deny`** como catch-all:

```yaml
bash:
  "*": deny
  "git status*": allow
  "npm test*": allow
  "npm ci*": allow
  "git add*": allow
  "git push*": deny        # y en DevOps: "ask"
  "*> *": deny             # ninguna redirección
  "rm*": deny
  "sudo*": deny
```

OpenCode evalúa la última regla que matchea sobre el comando parseado, así que `git status && rm -rf` matchea `git status*` para el primer verbo y cae en `*`: `deny` para el segundo.

Quién puede qué:

| | Lead | Architect | Dev | Reviewer | QA | DevOps |
|---|---|---|---|---|---|---|
| `bash` | lectura | **deny** | lectura + tests + git local | lectura + tests | lectura + tests | amplia, con `ask` |
| `edit` | solo `board/` | solo `board/` | código | **solo `board/`** | solo tests | código |
| `question` | **allow** | deny | deny | deny | deny | deny |

- El Lead recupera `bash` de **solo lectura** (`git diff`, `git status`, `git log`, leer archivos). No puede implementar ni testear — pero **sí puede verificar el diff en persona**, que es lo que hace posible cerrar un tier 0 sin spawnar a nadie.
- `push`, `gh pr create/merge`, `gh repo create` y `npm install` están en **`ask`** para DevOps: el usuario aprueba en el momento. Es conversacional a propósito.
- `chrome-devtools` y `playwright` denegados por defecto; solo QA los puede usar.
- La topología es **estrella**: los cinco subagentes tienen `task: deny`, así que ninguno puede delegar. El Lead es el único despachador.

## El equipo

| Rol | Qué hace | Escribe |
|---|---|---|
| **Lead** | Única voz con el usuario. Abre tickets, clasifica el tier, delega, reporta. | solo `board/` |
| **Architect** | Diseño técnico, interfaces, ADRs. Sin bash. | solo `board/` |
| **Dev** | Implementa código y tests. | código |
| **Reviewer** | Code review y seguridad (gate). | solo `board/` |
| **QA** | Tests, edge cases, verifica el DoD (gate). | tests |
| **DevOps** | Git, CI/CD, deploy, MCPs. | código/infra |

## Entorno vs proyecto

`.opencode/`, `opencode.json` y `AGENTS.md` son **infraestructura**, nunca trabajo de producto. `board/` es el tablero del equipo. Tu código vive en su propio árbol. Si resolver el producto pareciera requerir tocar el entorno, el equipo **lo escala en vez de hacerlo**.

Excepción única: **DevOps** puede tocar `opencode.json` para encender o apagar un MCP, y solo a pedido tuyo. Dev y QA tienen ese archivo denegado.

## Git es requisito

El Lead conversa y planifica siempre, pero **no abre tickets de trabajo si el proyecto no es un repo git**. Te guía con dos opciones: correr `git init`, o un ticket de setup que ejecuta DevOps (el único ticket permitido sin git).

El remoto no es obligatorio: sin él se trabaja con rama + commits locales. Crear repos, pushear y mergear PR **siempre** requieren tu aprobación.

## Herramientas pesadas

Tres MCPs vienen encendidos: `context7`, `codegraph`, `sequential-thinking`. Cuatro vienen **apagados** (`enabled: false`) con su definición lista:

| MCP | Para qué | Quién lo ve |
|---|---|---|
| `chrome-devtools` | Ver lo que ve el usuario | solo QA |
| `playwright` | Tests E2E | solo QA |
| `markitdown` | PDFs/Office/HTML a markdown | todos |
| `headroom` | Optimización de contexto | todos |

Encender uno es cambiar `false` → `true`. Después: **reiniciar OpenCode**. El Lead detecta si tu proyecto es una web app y te pregunta si querés encender DevTools.

## Instalación

```bash
git clone https://github.com/PortalesCode/gremio-2.git ~/tools/gremio-2
~/tools/gremio-2/install.sh --setup     # deja el comando `gremio2` en tu PATH
```

Después, en cada proyecto:

```bash
cd tu-proyecto
gremio2
```

Opciones: `--dry-run`, `--target <dir>`, `--keep-package`, `--version`. `gremio2 update` actualiza el paquete.

Qué hace el instalador:
- Copia `.opencode/` (agentes, skills, plugin).
- Crea `board/` solo con lo que falta: **no pisa tu tablero**.
- Inyecta el documento del equipo en tu `AGENTS.md` entre `<!-- GREMIO2-START -->` y `<!-- GREMIO2-END -->`, sin tocar el resto.
- Mergea `opencode.json` (MCPs, permisos, `default_agent: lead`) sin pisar tus claves.

Reiniciá OpenCode. Arranca en el **Lead**.

## Estructura

```
gremio-2/
├── .opencode/
│   ├── GREMIO.md          # doc del equipo (se inyecta en tu AGENTS.md)
│   ├── agents/            # lead, architect, dev, reviewer, qa, devops
│   ├── skills/            # 12 runbooks on-demand
│   ├── lib/               # lógica pura testeable (tiers, web app, git)
│   └── plugins/           # tools gremio_estado + gremio_tier
├── board/                 # tablero: BOARD.md, tickets/, adr/, templates/
├── opencode.json
└── install.sh
```

## Desarrollo

```bash
npm install
npm test
```

La lógica vive en `.opencode/lib/gremio-helpers.ts` (funciones puras) y los plugins solo arman las tools, así que los tests corren **sin el runtime de OpenCode**.

Tests de contrato que cubren lo que no hay que romper:
- `clasificarTier` — que un archivo de config o CI nunca caiga en tier 0, y que lo crítico siempre sea tier 3.
- `clasificarRuta` — match preciso de rutas sensibles, incluyendo separadores de Windows.
- Que las reglas del allowlist de `bash` sigan cubriendo `push`, redirecciones y `rm` después de cualquier cambio.

## Licencia

MIT — ver [LICENSE](LICENSE).