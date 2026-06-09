<?php
/**
 * db.php — Bootstrap de SQLite.
 * Crea la DB y todas las tablas si no existen.
 * Retorna la instancia PDO lista para usar.
 */
require_once __DIR__ . '/config.php';

function getDB() {
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    // Crear carpeta data/ si no existe
    $dataDir = dirname(DB_PATH);
    if (!is_dir($dataDir)) {
        mkdir($dataDir, 0755, true);
    }

    $pdo = new PDO('sqlite:' . DB_PATH);

    // Modo de error: lanza excepciones en lugar de silenciar errores
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Devuelve filas como arrays asociativos por defecto
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

    // WAL mode: mejora concurrencia en SQLite (reads no bloquean writes)
    $pdo->exec('PRAGMA journal_mode=WAL');

    // Activar foreign keys (SQLite las ignora por defecto)
    $pdo->exec('PRAGMA foreign_keys=ON');

    _createTables($pdo);
    _seedDefaults($pdo);

    return $pdo;
}

/**
 * Crea todas las tablas si no existen.
 * Seguro de llamar múltiples veces (IF NOT EXISTS).
 */
function _createTables($pdo) {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS projects (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            name       TEXT    NOT NULL,
            color      TEXT    DEFAULT '#ff6b6b',
            icon       TEXT    DEFAULT '📋',
            sort_order INTEGER DEFAULT 0,
            archived   INTEGER DEFAULT 0,
            created_at TEXT    DEFAULT (datetime('now'))
        )
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS sections (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
            name       TEXT    NOT NULL,
            sort_order INTEGER DEFAULT 0
        )
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS labels (
            id    INTEGER PRIMARY KEY AUTOINCREMENT,
            name  TEXT NOT NULL UNIQUE,
            color TEXT DEFAULT '#4ecdc4'
        )
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS tasks (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id   INTEGER REFERENCES projects(id) ON DELETE CASCADE,
            parent_id    INTEGER REFERENCES tasks(id)    ON DELETE CASCADE,
            section_id   INTEGER REFERENCES sections(id) ON DELETE SET NULL,
            title        TEXT    NOT NULL,
            description  TEXT    DEFAULT '',
            priority     INTEGER DEFAULT 4,
            due_date     TEXT,
            due_time     TEXT,
            recurrence   TEXT,
            completed    INTEGER DEFAULT 0,
            completed_at TEXT,
            sort_order   INTEGER DEFAULT 0,
            created_at   TEXT    DEFAULT (datetime('now')),
            updated_at   TEXT    DEFAULT (datetime('now'))
        )
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS task_labels (
            task_id  INTEGER REFERENCES tasks(id)  ON DELETE CASCADE,
            label_id INTEGER REFERENCES labels(id) ON DELETE CASCADE,
            PRIMARY KEY (task_id, label_id)
        )
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS comments (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id    INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
            content    TEXT    NOT NULL,
            created_at TEXT    DEFAULT (datetime('now'))
        )
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS reminders (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id   INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
            remind_at TEXT    NOT NULL,
            sent      INTEGER DEFAULT 0
        )
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS filters (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            name       TEXT NOT NULL,
            query      TEXT NOT NULL,
            color      TEXT DEFAULT '#a29bfe',
            created_at TEXT DEFAULT (datetime('now'))
        )
    ");
}

/**
 * Inserta datos de ejemplo solo si la DB está vacía.
 * Así el usuario ve algo al abrir la app por primera vez.
 */
function _seedDefaults($pdo) {
    $count = $pdo->query('SELECT COUNT(*) FROM projects')->fetchColumn();
    if ($count > 0) {
        return; // Ya tiene datos
    }

    // Proyecto de ejemplo
    $pdo->exec("INSERT INTO projects (name, color, icon) VALUES ('Personal', '#74b9ff', '🏠')");
    $pdo->exec("INSERT INTO projects (name, color, icon) VALUES ('Trabajo', '#a29bfe', '💼')");

    // Tarea de bienvenida en Inbox (sin proyecto)
    $pdo->exec("INSERT INTO tasks (title, description, priority)
                VALUES ('¡Bienvenido a Todos Synyster! 🎉',
                        'Tu gestor de tareas personal. Presiona Q para crear una tarea rápida.',
                        4)");
}
