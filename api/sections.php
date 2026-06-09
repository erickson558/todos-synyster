<?php
/**
 * api/sections.php — Secciones dentro de proyectos (para vista Kanban).
 * GET  ?project_id=
 * POST {project_id, name}
 * PUT  {id, name?, sort_order?}
 * DELETE ?id=
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
            $projectId = isset($_GET['project_id']) ? (int)$_GET['project_id'] : 0;
            if (!$projectId) { throw new Exception('project_id is required'); }
            $stmt = $db->prepare('SELECT * FROM sections WHERE project_id = ? ORDER BY sort_order ASC');
            $stmt->execute(array($projectId));
            echo json_encode(array('ok' => true, 'data' => $stmt->fetchAll()));
            break;

        case 'POST':
            $body = json_decode(file_get_contents('php://input'), true);
            if (!isset($body['project_id']) || !isset($body['name'])) {
                throw new Exception('project_id and name are required');
            }
            $maxOrder  = $db->prepare('SELECT MAX(sort_order) FROM sections WHERE project_id = ?');
            $maxOrder->execute(array((int)$body['project_id']));
            $sortOrder = ((int)$maxOrder->fetchColumn()) + 1;

            $db->prepare('INSERT INTO sections (project_id, name, sort_order) VALUES (?, ?, ?)')
               ->execute(array((int)$body['project_id'], trim($body['name']), $sortOrder));
            echo json_encode(array('ok' => true, 'data' => array('id' => (int)$db->lastInsertId())));
            break;

        case 'PUT':
            $body = json_decode(file_get_contents('php://input'), true);
            if (!isset($body['id'])) { throw new Exception('id is required'); }
            $sets = array(); $params = array(':id' => (int)$body['id']);
            foreach (array('name', 'sort_order') as $f) {
                if (array_key_exists($f, $body)) {
                    $sets[] = "$f = :$f"; $params[":$f"] = $body[$f];
                }
            }
            if ($sets) {
                $db->prepare('UPDATE sections SET ' . implode(', ', $sets) . ' WHERE id = :id')
                   ->execute($params);
            }
            echo json_encode(array('ok' => true));
            break;

        case 'DELETE':
            $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
            if (!$id) { throw new Exception('id is required'); }
            $db->prepare('DELETE FROM sections WHERE id = ?')->execute(array($id));
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
