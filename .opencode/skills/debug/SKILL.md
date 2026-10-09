---
name: debug
description: "Debugging metódico del Dev: reproducir, aislar, hipótesis, verificar. Usar cuando algo falla o se comporta raro."
---

# Runbook — Debug

## Pasos
1. **Reproducir:** conseguí el caso mínimo que falla. Sin reproducción, no hay debug.
2. **Observar:** leé el error/stack completo antes de tocar nada.
3. **Aislar:** reducí la superficie hasta un punto conocido.
4. **Hipótesis:** una por vez, y decidí cómo la vas a confirmar.
5. **Verificar:** comprobá la hipótesis con evidencia, no con intuición.
6. **Arreglar + test:** el fix va con un test que falle antes y pase después.

## Antipatrones
- Cambiar cosas al azar a ver si anda.
- Arreglar el síntoma sin entender la causa.
- Ignorar warnings que apuntan al problema.
- Decir "anda" sin haber corrido el caso que fallaba.
