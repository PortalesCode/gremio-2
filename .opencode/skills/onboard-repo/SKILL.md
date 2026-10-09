---
name: onboard-repo
description: "Poner Gremio a trabajar en un repo que ya existe: relevar qué hay (tests, CI, remoto, convenciones), completar el tablero y ofrecer solo lo que falta. Usar la primera vez que el usuario trae un repo existente."
---

# Runbook — Onboarding de un repo existente

## Cuándo
El usuario quiere usar Gremio en un repo que ya tiene código (con o sin git, con o sin CI). Gremio **no impone** su forma: se adapta.

## Pasos
1. Llamá `gremio_estado` y leé: git, rama, remoto, `base` (tests, CI, README, CONTRIBUTING, licencia), `web_app`.
2. Leé las reglas del proyecto: el **AGENTS.md propio** del repo (fuera del bloque Gremio), `CONTRIBUTING.md` y el README. **Esas convenciones mandan** sobre las de Gremio.
3. Completá el encabezado de `board/BOARD.md`: proyecto, raíz y remoto (si tiene).
4. Mostrale al usuario un relevamiento corto: **qué hay** y **qué falta**. Sin jerga.
5. Ofrecé **solo lo que falta**, cada cosa como ticket separado:
   - sin git → ticket de `project-setup` (DevOps).
   - sin tests → ticket de `test-setup` (Dev).
   - sin CI y con remoto → ticket de `ci-setup` (DevOps).
   - sin remoto → preguntá si quiere uno (privado por defecto) o si trabaja local.
6. Confirmá el **modelo de rama** (simple o GitFlow) según lo que ya use el repo; si no se sabe, preguntá.
7. No abras tickets de código hasta que el usuario apruebe la puesta en marcha o pida trabajo.

## Límites
- No dupliques lo que ya existe: si hay tests, no se reconfiguran; si hay CI, se respeta y solo se revisa.
- No cambies convenciones del repo por las de Gremio.
- No crees remotos ni pushees sin aprobación explícita del usuario.
- El onboarding se ofrece una vez; si el usuario dice "después", no insistas.
