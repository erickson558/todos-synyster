<?php
/**
 * api/comments.php — Comentarios de tareas.
 * GET  ?task_id=
 * POST {task_id, content}
 * DELETE ?id=
 */
require_once __DIR__ . '/../backend/config.php';
require_once __DIR__ . '/../backend/db.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$db     = getDB();
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            $taskId = isset($_GET['task_id']) ? (int)$_GET['task_id'] : 0;
            if (!$taskId) { throw new Exception('task_id is required'); }
            $stmt = $db->prepare('SELECT * FROM comments WHERE task_id = ? ORDER BY created_at ASC');
            $stmt->execute(array($taskId));
            echo json_encode(array('ok' => true, 'data' => $stmt->fetchAll()));
            break;

        case 'POST':
            $body = json_decode(file_get_contents('php://input'), true);
            if (!isset($body['task_id']) || !isset($body['content']) || trim($body['content']) === '') {
                throw new Exception('task_id and content are required');
            }
            $db->prepare('INSERT INTO comments (task_id, content) VALUES (?, ?)')
               ->execute(array((int)$body['task_id'], trim($body['content'])));
            echo json_encode(array('ok' => true, 'data' => array('id' => (int)$db->lastInsertId())));
            break;

        case 'DELETE':
            $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
            if (!$id) { throw new Exception('id is required'); }
            $db->prepare('DELETE FROM comments WHERE id = ?')->execute(array($id));
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
