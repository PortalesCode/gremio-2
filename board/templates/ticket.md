# T-XXXX — <título>

- **Tipo:** feature | bug | chore
- **Estado:** todo | doing | review | test | done
- **Tier:** 0 | 1 | 2 | 3
- **Ruta:** Dev → Lead | Dev → Reviewer | Architect → Dev → Reviewer → QA
- **Rama:** <tipo/T-XXXX-slug | —>
- **Responsable:** <rol>

> El tier sale de `gremio_tier({ archivos })`. Si lo bajás a mano, escribí acá por qué.

## Objetivo
<qué resultado se espera>

## Alcance
<qué entra>

## Exclusiones
<qué NO entra>

## Restricciones
<qué no se puede romper>

## Definition of Done
- [ ] <criterio verificable 1>
- [ ] <criterio verificable 2>
- [ ] Tests pasan (comando: `<comando>`)
- [ ] Sin secretos

## Artefactos

### Diseño (Architect) — tier 2/3
- ADR: <ADR-XXXX o —>
- Plan:

### Implementación (Dev)
- Archivos:
- Comando de tests:
- Salida:
- Decisiones no obvias:

### Review (Reviewer) — tier 1+
- Veredicto: aprobado | bloqueado
- Bloqueantes:
- No bloqueantes:

### Verificación (QA) — tier 2/3
- DoD verificado: sí | no
- Evidencia (comando + salida):
- Edge cases fuera y por qué:

### Entrega (DevOps)
- Rama / PR / merge:
- Desplegado y dónde:
- Rollback: