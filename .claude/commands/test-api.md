# /test-api – Skill: Probar endpoints de la API

Ejecuta un smoke-test completo de todos los endpoints REST de Todos Synyster.

## Base URL
```
http://localhost/monitoreos/todossynyster/api/
```

## Checks a ejecutar

### 1. GET /api/tasks.php?view=inbox
```powershell
Invoke-WebRequest -Uri "http://localhost/monitoreos/todossynyster/api/tasks.php?view=inbox" -UseBasicParsing | Select-Object -ExpandProperty Content | ConvertFrom-Json
```
Verificar: `ok: true`, array `data`, campo `completed` es integer (0 o 1).

### 2. POST /api/tasks.php — crear tarea de prueba
```powershell
$body = '{"title":"[TEST] QA Task","priority":4}'
Invoke-WebRequest -Uri "http://localhost/monitoreos/todossynyster/api/tasks.php" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing | Select-Object -ExpandProperty Content
```
Verificar: `{"ok":true,"data":{"id":N}}`

### 3. PUT /api/tasks.php — completar la tarea
```powershell
$id = <id_del_paso_2>
$body = "{`"id`":$id,`"completed`":1}"
Invoke-WebRequest -Uri "http://localhost/monitoreos/todossynyster/api/tasks.php" -Method PUT -Body $body -ContentType "application/json" -UseBasicParsing | Select-Object -ExpandProperty Content
```

### 4. DELETE /api/tasks.php — limpiar tarea de prueba
```powershell
Invoke-WebRequest -Uri "http://localhost/monitoreos/todossynyster/api/tasks.php?id=$id" -Method DELETE -UseBasicParsing | Select-Object -ExpandProperty Content
```

### 5. GET /api/projects.php
```powershell
Invoke-WebRequest -Uri "http://localhost/monitoreos/todossynyster/api/projects.php" -UseBasicParsing | Select-Object -ExpandProperty Content
```

### 6. GET /api/stats.php
```powershell
Invoke-WebRequest -Uri "http://localhost/monitoreos/todossynyster/api/stats.php" -UseBasicParsing | Select-Object -ExpandProperty Content
```
Verificar: campos `tasks_today`, `streak_days`, `completed_total`.

## Resultado esperado
Cada endpoint debe responder con `"ok":true` y HTTP 200.
Reportar ✅ PASS o ❌ FAIL con el error exacto recibido.
