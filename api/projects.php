<?php
/**
 * api/projects.php — CRUD de proyectos.
 * GET    Lista todos los proyectos con conteo de tareas pendientes
 * POST   Crear proyecto
 * PUT    Actualizar proyecto (id en body)
 * DELETE ?id=  Eliminar / archivar proyecto
 */
require_once __DIR__ . '/../backend/config.php';
require_once __DIR__ . '/../backend/db.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$db     = getDB();
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            $rows = $db->query(
                "SELECT p.*,
                        COUNT(t.id) AS task_count
                 FROM projects p
                 LEFT JOIN tasks t ON t.project_id = p.id
                                   AND t.completed = 0
                                   AND t.parent_id IS NULL
                 WHERE p.archived = 0
                 GROUP BY p.id
                 ORDER BY p.sort_order ASC, p.name ASC"
            )->fetchAll();

            // Incluir secciones de cada proyecto
            $secStmt = $db->prepare(
                'SELECT * FROM sections WHERE project_id = ? ORDER BY sort_order ASC'
            );
            foreach ($rows as &$proj) {
                $secStmt->execute(array($proj['id']));
                $proj['sections'] = $secStmt->fetchAll();
            }

            echo json_encode(array('ok' => true, 'data' => $rows));
            break;

        case 'POST':
            $body = json_decode(file_get_contents('php://input'), true);
            if (!isset($body['name']) || trim($body['name']) === '') {
                throw new Exception('name is required');
            }
            $maxOrder  = $db->query('SELECT MAX(sort_order) FROM projects')->fetchColumn();
            $sortOrder = $maxOrder !== null ? (int)$maxOrder + 1 : 0;

            $db->prepare(
                'INSERT INTO projects (name, color, icon, sort_order)
                 VALUES (:name, :color, :icon, :sort)'
            )->execute(array(
                ':name'  => trim($body['name']),
                ':color' => isset($body['color']) ? $body['color'] : '#ff6b6b',
                ':icon'  => isset($body['icon'])  ? $body['icon']  : '📋',
                ':sort'  => $sortOrder,
            ));
            echo json_encode(array('ok' => true, 'data' => array('id' => (int)$db->lastInsertId())));
            break;

        case 'PUT':
            $body = json_decode(file_get_contents('php://input'), true);
            if (!isset($body['id'])) { throw new Exception('id is required'); }

            $allowed = array('name', 'color', 'icon', 'sort_order', 'archived');
            $sets    = array();
            $params  = array(':id' => (int)$body['id']);
            foreach ($allowed as $f) {
                if (array_key_exists($f, $body)) {
                    $sets[]       = "$f = :$f";
                    $params[":$f"] = $body[$f];
                }
            }
            if ($sets) {
                $db->prepare('UPDATE projects SET ' . implode(', ', $sets) . ' WHERE id = :id')
                   ->execute($params);
            }
            echo json_encode(array('ok' => true));
            break;

        case 'DELETE':
            $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
            if (!$id) { throw new Exception('id is required'); }
            $db->prepare('DELETE FROM projects WHERE id = ?')->execute(array($id));
            echo json_encode(array('ok' => true));
            break;

        default:
            http_response_code(405);
            echo json_encode(array('ok' => false, 'error' => 'Method not allowed'));
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array('ok' => false, 'error' => $e->getMessage()));
}
