# /comment-code – Skill: Comentar código

Revisa el archivo indicado y agrega comentarios explicativos **solo donde el WHY no es obvio**: lógica compleja, workarounds, decisiones de diseño no evidentes, restricciones del entorno.

## Cuándo agregar comentario

✅ Agregar:
- Workaround para limitación de PHP 5.4
- Explicación de por qué se eligió un algoritmo específico
- Restricción de negocio no obvia (ej: "prioridad 1 es la más urgente, no la más baja")
- Comportamiento sorpresivo de una API o función

❌ NO agregar:
- Qué hace algo que ya dicen los nombres de variables/funciones
- Comentarios que describen el WHAT obvio (`// incrementa contador`)
- Comentarios que mencionan el número de ticket, tarea o PR
- Bloques de comentarios multi-línea innecesarios
- Docstrings completos para funciones simples

## Formato

**PHP:**
```php
// Por qué: PDO en SQLite no soporta multiple-insert en PHP 5.4
// Usamos loop en lugar de VALUES múltiples
```

**JavaScript:**
```js
// Usamos XHR en lugar de fetch() — fetch no existe en IE11
// y EasyPHP sirve páginas a clientes legacy
```

**CSS:**
```css
/* z-index 9999: el modal debe quedar encima del sidebar (z:100)
   y del overlay de drag-drop (z:500) */
```

## Pasos al invocar este skill

1. Leer el archivo objetivo con `Read`
2. Identificar secciones con lógica no obvia
3. Agregar SOLO los comentarios que aporten valor real
4. Usar `Edit` para insertar los comentarios
5. No reformatear ni refactorizar el código — solo comentar
6. Reportar qué se comentó y por qué

## Ejemplo de uso

```
/comment-code backend/db.php
/comment-code frontend/js/dragdrop.js
/comment-code api/tasks.php
```
