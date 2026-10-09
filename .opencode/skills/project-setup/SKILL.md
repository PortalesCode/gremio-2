---
name: project-setup
description: "Puesta en marcha de un proyecto para el Gremio: git init, identidad, primer commit y remoto opcional. Usar solo en el ticket de setup cuando la carpeta no es un repo git."
---

# Runbook — Setup de proyecto (bootstrap)

## Cuándo
Solo en el **ticket de setup**. Es la única excepción a la regla "sin git no se trabaja": existe justamente para crear el git.

## Pasos
1. Verificá que **no** exista `.git`. Si existe, no hagas nada y avisá al Lead.
2. `git init -b main`.
3. Configurá identidad **local** (nunca global): `git config user.name` / `user.email` (los que indique el usuario).
4. Creá un `.gitignore` razonable para el stack detectado (si no existe).
5. Primer commit: `chore: inicializa el repositorio`.
6. **Remoto (opcional):** solo si el usuario lo aprueba. Repo nuevo por defecto **privado**.
7. Reportá al Lead: ruta, rama, si hay remoto (o "sin remoto"), y el commit inicial.

## Límites
- No instales dependencias ni escribas código de aplicación: eso es de otros tickets.
- No pushees sin aprobación explícita del usuario.
- Si `git` no está instalado, frena y avisá al Lead (no inventes).
