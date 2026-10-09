---
name: implement
description: "Reglas de implementación del Dev: alcance, convenciones, tests y evidencia. Usar al escribir código para un ticket."
---

# Runbook — Implementar

## Antes de escribir
1. Leé el ticket completo y el ADR si existe.
2. Mirá el código vecino: copiá su estilo y sus patrones.
3. Confirmá el comando de test del proyecto (README / package.json / Makefile).

## Reglas de edición
- Cambiá **solo** lo que el alcance pide.
- No refactorices de paso lo que no hace falta.
- Preservá el estilo, los imports y las utilidades existentes.
- Nada de secretos ni credenciales en el código.

## Tests
- Todo cambio de lógica lleva test que lo pruebe.
- Corré los tests antes de entregar; si no podés, decilo con el motivo.
- Dejá en el ticket el **comando exacto** para verificar.

## Cierre
Actualizá el ticket: qué cambiaste, archivos, cómo probarlo, decisiones no obvias. No cierres el ticket.
