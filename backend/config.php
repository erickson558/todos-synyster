<?php
/**
 * config.php — Constantes globales de Todos Synyster.
 * Cambiar APP_VERSION aquí y en VERSION al hacer release.
 */

define('APP_NAME',    'Todos Synyster');
define('APP_VERSION', 'V1.0.0');

// Ruta absoluta a la base de datos SQLite
define('DB_PATH', __DIR__ . '/../data/todos.db');

// Carpeta de uploads para adjuntos de tareas
define('UPLOADS_DIR', __DIR__ . '/../data/uploads/');

// Tamaño máximo de adjunto en MB
define('MAX_UPLOAD_MB', 10);

// Zona horaria por defecto
date_default_timezone_set('America/Guatemala');

// Inicia sesión PHP (sin usuario/password — uso personal local)
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
