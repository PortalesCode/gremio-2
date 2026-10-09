# Board — Gremio 2

- **Proyecto:** <nombre>
- **Raíz:** <ruta>
- **Remoto:** <url | sin remoto>

Índice de tickets del equipo. El Lead lo mantiene.

| ID | Título | Tipo | Tier | Ruta | Estado | Responsable |
|---|---|---|---|---|---|---|
| — | _(sin tickets todavía)_ | | | | | |

## Estados
`todo` → `doing` → `review` → `test` → `done`

## Convenciones
- Un ticket por archivo: `board/tickets/T-XXXX.md`.
- El estado del tablero y el del ticket deben coincidir.
- Al cerrar un ticket (`done`), queda como historial; no se borra.
- El **tier** sale de `gremio_tier({ archivos })`. Bajarlo a mano exige justificación escrita en el ticket.
- Tiers altos (`review`/`test`) solo aplican cuando el tier los exige: en tier 0 el ticket pasa de `doing` a `done` directo, con la evidencia de tests pegada.