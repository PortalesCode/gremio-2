---
name: git-workflow
description: "Flujo git del Gremio: ramas por ticket, commits, PR, gates y merge. Usar cuando un ticket toca código o hay que publicar cambios."
---

# Runbook — Flujo git

## Modelos de rama
- **Simple (default):** `main` + una rama por ticket + PR. Es lo que usa la mayoría.
- **GitFlow (con releases):** `main` + `develop` + `feature/*` + `release/*` + `hotfix/*`. Solo si el proyecto versiona releases y necesita estabilización.

El Lead confirma el modelo al inicio (o lo toma de las convenciones del proyecto) y lo deja escrito en el board.

## Reglas base
- **Nunca se trabaja directo sobre `main`.** Cada ticket de código va en su rama.
- **Rama:** `tipo/T-XXXX-slug-corto` — `feature/T-0007-login`, `fix/T-0012-email-mayusculas`, `chore/T-0003-gitignore`.
- **Commit:** en imperativo, con el ticket adelante — `T-0007: agrega hash_password con PBKDF2`.
- **Nunca:** `push --force`, commitear secretos, tocar `main` a mano, reescribir historia con remoto.
- Commits chicos y con un solo propósito.

## Con remoto (GitHub) — flujo PR
1. **DevOps** crea la rama desde `main` y commitea el trabajo aprobado.
2. **DevOps** pushea la rama y abre el PR (con `gh`), describiendo el ticket.
3. **Reviewer** y **QA** revisan **el PR** y dejan su veredicto en el ticket.
4. **CI** corre sola (si el proyecto la tiene; si no, se propone configurarla con `ci-setup`, DevOps); con branch protection, el merge queda bloqueado si falta aprobación o el CI está rojo.
5. **DevOps** mergea **solo** con todo aprobado, y borra la rama.

## Sin remoto
- Rama + commits locales; el merge a `main` lo hace DevOps después de los gates.
- El Lead anota **"sin remoto"** en el ticket y en el board.

## Límites duros
- Crear repos, pushear o mergear un PR requiere **aprobación explícita del usuario** (vía Lead).
- Repo nuevo por defecto: **privado**.
- Si algo no se puede revertir, se frena y escala al Lead.
