---
name: test-setup
description: "Poner en marcha los tests de un proyecto: runner, configuración, primer test real y comando único. Usar cuando el proyecto no tiene tests o no hay forma clara de correrlos."
---

# Runbook — Setup de tests

## Cuándo
El proyecto no tiene runner de tests, o no existe un **comando único y documentado**.

## Pasos
1. Detectá el stack (`package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`) y si ya hay algún test.
2. Elegí el runner **estándar del stack**:
   - Python → `pytest` (como extra de desarrollo).
   - Node/TS → `vitest`, o el que ya use el proyecto.
   - Go → `go test ./...`.
   - Otro → el estándar del lenguaje.
3. Configurá el runner en el manifiesto (ej: `[tool.pytest.ini_options] testpaths = ["tests"]`) y declaralo como dependencia de **desarrollo**.
4. Creá `tests/` con al menos un test **real** que falle si se rompe algo (no un test vacío).
5. Documentá en el README el **comando único** (`python -m pytest`, `npm test`, etc.).
6. Reportá en el ticket: runner elegido, comando exacto y evidencia de la corrida.

## Límites
- No inventes un comando: probalo y pegá la salida real.
- Los tests van como dependencia de desarrollo, nunca de producción.
- Si todavía no hay nada que testear, decilo y devolvelo al Lead.
- La CI se configura en otro ticket (`ci-setup`, DevOps).
