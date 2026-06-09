<?php
/**
 * api/labels.php — CRUD de etiquetas.
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
                "SELECT l.*, COUNT(tl.task_id) AS task_count
                 FROM labels l
                 LEFT JOIN task_labels tl ON tl.label_id = l.id
                 GROUP BY l.id
                 ORDER BY l.name ASC"
            )->fetchAll();
            echo json_encode(array('ok' => true, 'data' => $rows));
            break;

        case 'POST':
            $body = json_decode(file_get_contents('php://input'), true);
            if (!isset($body['name']) || trim($body['name']) === '') {
                throw new Exception('name is required');
            }
            $db->prepare('INSERT OR IGNORE INTO labels (name, color) VALUES (:name, :color)')
               ->execute(array(
                   ':name'  => trim($body['name']),
                   ':color' => isset($body['color']) ? $body['color'] : '#4ecdc4',
               ));
            echo json_encode(array('ok' => true, 'data' => array('id' => (int)$db->lastInsertId())));
            break;

        case 'PUT':
            $body = json_decode(file_get_contents('php://input'), true);
            if (!isset($body['id'])) { throw new Exception('id is required'); }
            $sets = array(); $params = array(':id' => (int)$body['id']);
            foreach (array('name', 'color') as $f) {
                if (array_key_exists($f, $body)) {
                    $sets[] = "$f = :$f"; $params[":$f"] = $body[$f];
                }
            }
            if ($sets) {
                $db->prepare('UPDATE labels SET ' . implode(', ', $sets) . ' WHERE id = :id')
                   ->execute($params);
            }
            echo json_encode(array('ok' => true));
            break;

        case 'DELETE':
            $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
            if (!$id) { throw new Exception('id is required'); }
            $db->prepare('DELETE FROM labels WHERE id = ?')->execute(array($id));
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
