---
name: write-adr
description: Cómo documentar una decisión de arquitectura de forma breve y útil (ADR). Usar cuando una decisión técnica no obvia afecta el diseño.
---

# Runbook — Escribir un ADR

## Formato
Copiá `board/templates/adr.md` a `board/adr/ADR-XXXX.md`.

## Secciones
- **Contexto:** la situación y la fuerza que obliga a decidir.
- **Decisión:** qué se eligió, en una o dos frases.
- **Alternativas:** qué se descartó y por qué.
- **Consecuencias:** lo bueno y lo malo que trae (tradeoffs).

## Reglas
- Un ADR = una decisión. No mezcles varias.
- Escribí para alguien que no estuvo en la conversación.
- Corto: si no entra en una pantalla, sobra.
- Vinculá el ADR al ticket (`T-XXXX`).
