---
name: architecture-review
description: "Cómo el Architect evalúa un diseño antes de escribir código: límites, interfaces, riesgos y plan. Usar al diseñar cualquier cambio que toque más de un archivo."
---

# Runbook — Revisión de arquitectura

## Pasos
1. Leé el ticket: objetivo, alcance, restricciones, DoD.
2. Mapeá lo que ya existe (archivos/módulos afectados) antes de proponer.
3. Definí **interfaces** (qué entra y sale de cada componente) antes de la implementación.
4. Enumerá **riesgos** reales (acoplamiento, datos, performance, seguridad).
5. Proponé el **plan de tareas** mínimo en orden de ejecución.

## Heurísticas
- La solución más simple que funcione gana; la complejidad se justifica por escrito.
- Preferí cambios **reversibles** y **locales** a los globales.
- Si un componente crece en responsabilidades, marcalo: es señal de división.
- Toda decisión no obvia va a un ADR (`write-adr`).

## Salida
ADR + plan + riesgos, vinculados al ticket.
