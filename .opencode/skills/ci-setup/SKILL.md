---
name: ci-setup
description: "Configurar CI automática en GitHub Actions: tests en cada push y PR, matrix de versiones y branch protection para que no se mergee sin verde. Usar cuando el proyecto necesita automatizar sus tests."
---

# Runbook — CI automática

## Requisitos
- Repo git con **remoto en GitHub** y un **comando de tests** ya definido. Si no hay runner de tests, primero va `test-setup` (Dev).
- Si no hay remoto, el workflow se puede dejar listo, pero **no corre**: avisalo.

## Pasos
1. Confirmá el comando de tests real (el del README/manifiesto) y las versiones soportadas.
2. Creá `.github/workflows/ci.yml`:
   - `on: [push, pull_request]`
   - `permissions: contents: read`
   - matrix con las versiones soportadas (ej: `3.10`, `3.11`, `3.12`)
   - cache de dependencias
   - pasos: checkout → setup del lenguaje → instalar dependencias → correr tests
3. Si el proyecto tiene linter/formatter configurado, agregá el chequeo (en CI **no** se auto-corrige: solo se verifica).
4. **Branch protection** (solo con aprobación del usuario): exigir PR + 1 aprobación + status checks en verde. Se hace por `gh api` o por la UI de GitHub.
5. Reportá en el ticket: ruta del workflow, comando que corre, cómo ver el estado, y **rollback** (borrar el archivo).

## Opcional (si el usuario lo aprueba)
- **Dependabot**: avisos de dependencias desactualizadas o vulnerables.
- **CodeQL**: análisis de seguridad.

## Límites
- No pushees ni cambies la protección de rama sin aprobación explícita del usuario (vía Lead).
- El CI no arregla tests rojos: si fallan, se devuelve a Dev.
- Versiones estables de actions (tag mayor), sin versiones flotantes raras.
