<?php
/**
 * index.php — Shell HTML de Todos Synyster.
 * El SPA se monta en #app desde app.js.
 * PHP solo sirve el HTML inicial con las versiones de cache-busting.
 */
require_once __DIR__ . '/backend/config.php';

$cssVer = @filemtime(__DIR__ . '/frontend/css/style.css');
$jsVer  = @filemtime(__DIR__ . '/frontend/js/app.js');
?><!doctype html>
<html lang="es" data-theme="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Todos Synyster — Gestor de tareas completo con todas las funciones premium.">
  <title><?php echo APP_NAME; ?> <?php echo APP_VERSION; ?></title>

  <!-- Hoja de estilos principal -->
  <link rel="stylesheet" href="./frontend/css/style.css?v=<?php echo (int)$cssVer; ?>">

  <!-- Favicon emoji -->
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>✅</text></svg>">
</head>
<body>
  <!-- El SPA monta todo aquí desde app.js -->
  <div id="app-root">
    <!-- Pantalla de carga antes de que arranque JS -->
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:16px;
                background:#1a1a2e;color:#e8eaf6;font-family:system-ui,sans-serif">
      <div style="font-size:48px">✅</div>
      <div style="font-size:20px;font-weight:700">Todos Synyster</div>
      <div style="width:24px;height:24px;border:3px solid #333;border-top-color:#e94560;
                  border-radius:50%;animation:spin 0.7s linear infinite"></div>
      <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
    </div>
  </div>

  <!-- Módulos JS — orden importa (deps primero) -->
  <script src="./frontend/js/i18n.js?v=<?php echo (int)$jsVer; ?>"></script>
  <script src="./frontend/js/api.js?v=<?php echo (int)$jsVer; ?>"></script>
  <script src="./frontend/js/dragdrop.js?v=<?php echo (int)$jsVer; ?>"></script>
  <script src="./frontend/js/shortcuts.js?v=<?php echo (int)$jsVer; ?>"></script>
  <script src="./frontend/js/app.js?v=<?php echo (int)$jsVer; ?>"></script>
</body>
</html>
