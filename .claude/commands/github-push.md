# /github-push – Skill: Commit y Push a GitHub

Realiza commit de todos los cambios pendientes y hace push al repositorio `erickson558/todos-synyster` en la rama `main`.

## Cuenta GitHub
- **Usuario:** erickson558
- **Protocolo:** HTTPS (autenticado via keyring de `gh` CLI)
- **Remote:** `https://github.com/erickson558/todos-synyster.git`

## Pasos a ejecutar

### 1. Revisar estado
```powershell
git -C "c:\Program Files (x86)\EasyPHP-Webserver-14.1b2\www\monitoreos\todossynyster" status
git -C "c:\Program Files (x86)\EasyPHP-Webserver-14.1b2\www\monitoreos\todossynyster" diff --stat
```

### 2. Verificar archivos sensibles
No commitear: `data/todos.db`, `data/*.db`, `data/uploads/`, archivos `.env`.

### 3. Construir mensaje de commit (Conventional Commits)
- `feat:` nueva funcionalidad
- `fix:` corrección de bug
- `chore:` mantenimiento (releases, deps)
- `docs:` solo documentación
- `style:` CSS/formato sin lógica
- `refactor:` refactorización sin cambio de comportamiento

### 4. Commit y push
```powershell
$base = "c:\Program Files (x86)\EasyPHP-Webserver-14.1b2\www\monitoreos\todossynyster"
git -C $base add -A
git -C $base commit -m "tipo: descripción"
git -C $base push origin main
```

### 5. Confirmar
Mostrar URL del commit en GitHub:
`https://github.com/erickson558/todos-synyster/commits/main`

## Notas
- Si el repositorio remoto no existe aún:
  ```powershell
  gh repo create erickson558/todos-synyster --public --source="c:\Program Files (x86)\EasyPHP-Webserver-14.1b2\www\monitoreos\todossynyster" --remote=origin --push
  ```
- Nunca usar `--force` en main
- Nunca commitear `data/todos.db`
