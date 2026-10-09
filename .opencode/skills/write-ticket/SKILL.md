---
name: write-ticket
description: Cómo el Lead convierte una intención del usuario en un ticket, clasifica su tier con gremio_tier y mantiene el tablero. Usar al abrir cualquier trabajo.
---

# Runbook — Escribir un ticket

## Formato
Copiá `board/templates/ticket.md` a `board/tickets/T-XXXX.md` (ID incremental de 4 dígitos).

## Campos obligatorios
- **Título:** acción concreta, no un tema.
- **Tipo:** `feature` | `bug` | `chore`.
- **Objetivo:** qué resultado se espera.
- **Alcance / Exclusiones:** qué entra y qué no.
- **Restricciones:** lo que no se puede romper.
- **DoD:** criterios verificables (test/comando).
- **Tier:** 0 | 1 | 2 | 3 (lo devuelve `gremio_tier`).
- **Ruta:** la que salga del tier.

## Elegir el tier — no lo juzgues a mano

1. Listá los archivos que el ticket va a tocar.
2. Llamá `gremio_tier({ archivos })`. Te devuelve `tier`, `ruta`, `gates` y `motivo`.
3. Usá eso. Si el cambio además es de auth/datos/pagos o toca deploy, pasale `critico: true` o `infra: true`.

| Tier | Ruta | Gates |
|---|---|---|
| 0 | Dev → Lead | evidencia de tests en el ticket |
| 1 | Dev → Reviewer | review de diff |
| 2 | Architect → Dev → Reviewer → QA | review + QA con evidencia |
| 3 | Architect → Dev → Reviewer → QA | + aprobación del usuario |

**Bajar el tier devuelto exige justificación escrita en el ticket.** Subirlo es siempre libre.

## Tablero
Actualizá `board/BOARD.md` con: ID, título, estado (`todo/doing/review/test/done`) y responsable.

## Checklist del Lead
- [ ] Creé el ticket con todos los campos.
- [ ] El tier está escrito en el ticket y su ruta coincide.
- [ ] Si bajé el tier, está justificado por escrito.
- [ ] Anoté el ticket en el tablero.
- [ ] Delegué al primer rol de la ruta con el ticket (no la conversación).
- [ ] Cierro solo con el DoD completo.
