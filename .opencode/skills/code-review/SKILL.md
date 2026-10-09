---
name: code-review
description: Cómo el Reviewer revisa un cambio y emite veredicto bloqueante o aprobado. Usar al revisar cualquier entrega de Dev.
---

# Runbook — Code Review

## Alcance según el tier (leelo del ticket)

- **tier 1** — revisión **acotada al diff**. Correctitud y alcance del ticket. No re-litigues arquitectura ni accesibilidad; no es una auditoría.
- **tier 2/3** — revisión **completa**: el checklist de abajo, entero.

## Qué mirar (en este orden)
1. **Correctitud:** ¿hace lo que el ticket dice? ¿hay bugs o edge cases olvidados?
2. **Seguridad:** entrada no validada, secretos, inyección, permisos.
3. **Datos:** migraciones, transacciones, estados inconsistentes.
4. **Tests:** ¿prueban lo que importa? ¿faltan casos?
5. **Mantenibilidad:** claridad y acoplamiento (solo si afecta de verdad).

## Veredicto
- `bloqueado` si hay al menos un bloqueante.
- `aprobado` si no hay bloqueantes (las mejoras van como no bloqueantes).

## Formato del review (en el ticket)
```
Veredicto: aprobado | bloqueado
Bloqueantes:
  - archivo:línea — problema y por qué
No bloqueantes:
  - sugerencia
```

## Límites
- No modificás código: señalás.
- No bloqueás por gusto personal: solo correctitud, seguridad o mantenibilidad real.
- Si el cambio no coincide con el ticket → bloqueante.
- Toda afirmación de comportamiento ("esto cuelga", "esto falla", "esto es lento") debe estar **verificada con evidencia**. Si no lo verificaste, presentala como **hipótesis a confirmar**, no como hallazgo.
