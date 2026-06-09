# /release – Skill: Crear un nuevo release

Realiza todos los pasos para publicar una nueva versión de Todos Synyster: bump de versión, docs, commit, tag, push y release en GitHub.

## Uso

```
/release patch    # V1.0.0 → V1.0.1  (bug fix, ajuste visual)
/release minor    # V1.0.0 → V1.1.0  (nueva feature)
/release major    # V1.0.0 → V2.0.0  (arquitectura / DB schema)
```

## Pasos

### 1. Leer versión actual
```powershell
Get-Content "c:\Program Files (x86)\EasyPHP-Webserver-14.1b2\www\monitoreos\todossynyster\VERSION"
```

### 2. Calcular nueva versión
- Parsear `Vx.y.z`
- Incrementar según argumento (patch/minor/major)
- Resetear segmentos inferiores al incrementado a 0

### 3. Actualizar archivos

**VERSION** — solo la nueva versión:
```
Vnueva
```

**backend/config.php** — línea `APP_VERSION`:
```php
define('APP_VERSION', 'Vnueva');
```

**CHANGELOG.md** — insertar nueva sección al inicio (después del título):
```markdown
## [Vnueva] – YYYY-MM-DD

### Added / Fixed / Changed
- Descripción del cambio principal
```

**SDD.md** — actualizar tabla de historial § 11:
```markdown
| Vnueva | YYYY-MM-DD | Descripción del cambio |
```

### 4. Commit de release
```powershell
$base = "c:\Program Files (x86)\EasyPHP-Webserver-14.1b2\www\monitoreos\todossynyster"
git -C $base add VERSION backend/config.php CHANGELOG.md SDD.md
git -C $base commit -m "chore(release): bump version to Vnueva"
git -C $base push origin main
```

### 5. Tag y push del tag
```powershell
git -C $base tag Vnueva
git -C $base push origin Vnueva
```

### 6. Verificar que GitHub Actions creó el release
```powershell
gh run list --repo erickson558/todos-synyster --limit 3
```
URL del release: `https://github.com/erickson558/todos-synyster/releases`

## Notas de versionado

| Cambio | Segmento |
|--------|----------|
| Cambio de arquitectura / DB schema incompatible | major |
| Nueva vista, nueva feature completa | minor |
| Bug fix, ajuste CSS, nueva traducción | patch |

## Estrategia DevOps completa (prompt de referencia)

Este skill implementa el flujo descrito en el prompt optimizado para GitHub:
- Versionado `Vx.x.x` consistente en app, código, tags, releases, README
- GitHub Actions genera el release al detectar el nuevo tag
- Todos los artefactos quedan adjuntos al release automáticamente
