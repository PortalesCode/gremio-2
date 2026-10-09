---
name: ship
description: "Cómo DevOps entrega un cambio: CI/CD, configuración, deploy y rollback reversible. Usar cuando el ticket toca infra o entrega."
---

# Runbook — Ship

## Antes de desplegar
1. Confirmá que el cambio pasó Reviewer y QA (gates).
2. Revisá variables/secretos requeridos (nombres, nunca valores).
3. Verificá el pipeline (CI) en verde.

## Deploy
- Preferí entrega gradual/atómica.
- Un cambio = una unidad desplegable.
- No despliegues a producción sin aprobación explícita del usuario (vía Lead).

## Rollback (obligatorio)
Dejá en el ticket el comando/pasos exactos para revertir. Si un cambio no se puede revertir, se frena.

## Reporte (en el ticket)
```
Desplegado: qué y dónde
Rollback: comando/pasos
Secretos requeridos: <nombres>
CI: verde | rojo
```
