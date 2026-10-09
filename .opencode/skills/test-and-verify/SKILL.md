---
name: test-and-verify
description: "Cómo QA verifica el Definition of Done con evidencia: tests, edge cases y reporte. Usar antes de cerrar cualquier ticket."
---

# Runbook — Test y verificación

## Pasos
1. Leé el **DoD** del ticket: es tu lista de verificación.
2. Detectar el runner de tests del proyecto y correrlo.
3. Agregar tests para los casos del ticket, incluyendo **edge cases**.
4. Probar lo que el DoD pide, no lo que crees que quiso decir.

## Evidencia (obligatoria)
Para cada criterio: el **comando** y el **resultado**.
```
$ <comando>
<salida relevante>
```

## Reporte (en el ticket)
```
DoD verificado: sí | no
Tests: <agregados/corridos> — comando + resultado
Edge cases: <probados> / <fuera de alcance + motivo>
Si falla: caso mínimo que reproduce — devolver a Dev
```

## Límites
- Escribís tests, no código de producción.
- No cambiás la implementación para que pase.
- Sin evidencia no hay aprobación.
