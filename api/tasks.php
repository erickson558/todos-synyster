<?php
/**
 * api/tasks.php — CRUD de tareas.
 * GET    ?view=inbox|today|upcoming|completed|all  &project_id=&label_id=&search=&parent_id=
 * POST   Crear tarea (JSON body)
 * PUT    Actualizar tarea (JSON body con id)
 * DELETE ?id=   Eliminar tarea
 */
require_once __DIR__ . '/../backend/config.php';
require_once __DIR__ . '/../backend/db.php';

header('Content-Type: application/json; charset=utf-8');

// Permite peticiones desde el mismo origen (SPA en el mismo servidor)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$db     = getDB();
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            echo json_encode(getTasks($db));
            break;
        case 'POST':
            $body = json_decode(file_get_contents('php://input'), true);
            echo json_encode(createTask($db, $body));
            break;
        case 'PUT':
            $body = json_decode(file_get_contents('php://input'), true);
            echo json_encode(updateTask($db, $body));
            break;
        case 'DELETE':
            echo json_encode(deleteTask($db, isset($_GET['id']) ? (int)$_GET['id'] : 0));
            break;
        default:
            http_response_code(405);
            echo json_encode(array('ok' => false, 'error' => 'Method not allowed'));
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array('ok' => false, 'error' => $e->getMessage()));
}

// ─── Consultas ───────────────────────────────────────────────────────────────

function getTasks($db) {
    $view      = isset($_GET['view'])       ? $_GET['view']            : 'inbox';
    $projectId = isset($_GET['project_id']) ? (int)$_GET['project_id'] : null;
    $labelId   = isset($_GET['label_id'])   ? (int)$_GET['label_id']   : null;
    $search    = isset($_GET['search'])     ? trim($_GET['search'])     : '';
    $parentId  = isset($_GET['parent_id'])  ? (int)$_GET['parent_id']  : null;

    $where  = array();
    $params = array();

    // Filtro por parent (sub-tareas)
    if ($parentId !== null) {
        $where[]              = 't.parent_id = :parent_id';
        $params[':parent_id'] = $parentId;
    } else {
        // Por defecto solo raíz (sin parent)
        if (!isset($_GET['all_levels'])) {
            $where[] = 't.parent_id IS NULL';
        }
    }

    // Vistas estándar
    switch ($view) {
        case 'inbox':
            $where[] = 't.project_id IS NULL';
            $where[] = 't.completed = 0';
            break;
        case 'today':
            $where[] = "date(t.due_date) = date('now')";
            $where[] = 't.completed = 0';
            break;
        case 'upcoming':
            $where[] = "t.due_date IS NOT NULL AND date(t.due_date) > date('now')";
            $where[] = 't.completed = 0';
            break;
        case 'completed':
            $where[] = 't.completed = 1';
            break;
        case 'overdue':
            $where[] = "t.due_date IS NOT NULL AND date(t.due_date) < date('now')";
            $where[] = 't.completed = 0';
            break;
        case 'all':
            $where[] = 't.completed = 0';
            break;
        default:
            $where[] = 't.completed = 0';
    }

    // Filtro por proyecto
    if ($projectId) {
        $where[]              = 't.project_id = :project_id';
        $params[':project_id'] = $projectId;
    }

    // Filtro por etiqueta
    if ($labelId) {
        $where[]           = 'EXISTS (SELECT 1 FROM task_labels tl WHERE tl.task_id = t.id AND tl.label_id = :label_id)';
        $params[':label_id'] = $labelId;
    }

    // Búsqueda por texto
    if ($search !== '') {
        $where[]         = '(t.title LIKE :search OR t.description LIKE :search)';
        $params[':search'] = '%' . $search . '%';
    }

    $whereClause = count($where) ? 'WHERE ' . implode(' AND ', $where) : '';

    $sql = "SELECT t.*,
                   p.name  AS project_name,
                   p.color AS project_color,
                   p.icon  AS project_icon
            FROM tasks t
            LEFT JOIN projects p ON p.id = t.project_id
            $whereClause
            ORDER BY t.sort_order ASC, t.priority ASC, t.created_at DESC";

    $stmt = $db->prepare($sql);
    foreach ($params as $key => $val) {
        $stmt->bindValue($key, $val);
    }
    $stmt->execute();
    $tasks = $stmt->fetchAll();

    // Adjuntar etiquetas y castear tipos enteros (PDO SQLite devuelve todo como string)
    foreach ($tasks as &$task) {
        $task['id']           = (int)$task['id'];
        $task['completed']    = (int)$task['completed'];
        $task['priority']     = (int)$task['priority'];
        $task['sort_order']   = (int)$task['sort_order'];
        $task['project_id']   = isset($task['project_id'])  ? (int)$task['project_id']  : null;
        $task['parent_id']    = isset($task['parent_id'])   ? (int)$task['parent_id']   : null;
        $task['section_id']   = isset($task['section_id'])  ? (int)$task['section_id']  : null;
        $task['labels']       = getTaskLabels($db, $task['id']);
        $task['subtask_count'] = getSubtaskCount($db, $task['id']);
    }

    return array('ok' => true, 'data' => $tasks);
}

function getTaskLabels($db, $taskId) {
    $stmt = $db->prepare(
        'SELECT l.id, l.name, l.color
         FROM labels l
         INNER JOIN task_labels tl ON tl.label_id = l.id
         WHERE tl.task_id = ?'
    );
    $stmt->execute(array($taskId));
    return $stmt->fetchAll();
}

function getSubtaskCount($db, $taskId) {
    $stmt = $db->prepare('SELECT COUNT(*) FROM tasks WHERE parent_id = ? AND completed = 0');
    $stmt->execute(array($taskId));
    return (int)$stmt->fetchColumn();
}

// ─── Crear tarea ─────────────────────────────────────────────────────────────

function createTask($db, $body) {
    if (!isset($body['title']) || trim($body['title']) === '') {
        return array('ok' => false, 'error' => 'title is required');
    }

    $title       = trim($body['title']);
    $description = isset($body['description']) ? trim($body['description']) : '';
    $projectId   = isset($body['project_id'])  ? (int)$body['project_id']  : null;
    $parentId    = isset($body['parent_id'])    ? (int)$body['parent_id']   : null;
    $sectionId   = isset($body['section_id'])   ? (int)$body['section_id']  : null;
    $priority    = isset($body['priority'])     ? (int)$body['priority']    : 4;
    $dueDate     = isset($body['due_date'])     ? $body['due_date']         : null;
    $dueTime     = isset($body['due_time'])     ? $body['due_time']         : null;
    $recurrence  = isset($body['recurrence'])   ? $body['recurrence']       : null;

    // Calcular sort_order: al final de la lista
    $maxOrder = $db->query('SELECT MAX(sort_order) FROM tasks')->fetchColumn();
    $sortOrder = $maxOrder !== null ? (int)$maxOrder + 1 : 0;

    $stmt = $db->prepare(
        'INSERT INTO tasks (project_id, parent_id, section_id, title, description,
                            priority, due_date, due_time, recurrence, sort_order)
         VALUES (:pid, :parent, :section, :title, :desc,
                 :priority, :due_date, :due_time, :recurrence, :sort)'
    );
    $stmt->execute(array(
        ':pid'        => $projectId,
        ':parent'     => $parentId,
        ':section'    => $sectionId,
        ':title'      => $title,
        ':desc'       => $description,
        ':priority'   => $priority,
        ':due_date'   => $dueDate,
        ':due_time'   => $dueTime,
        ':recurrence' => $recurrence,
        ':sort'       => $sortOrder,
    ));

    $taskId = (int)$db->lastInsertId();

    // Asociar etiquetas si se pasaron
    if (!empty($body['labels']) && is_array($body['labels'])) {
        setTaskLabels($db, $taskId, $body['labels']);
    }

    // Crear recordatorio si se pasó
    if (!empty($body['remind_at'])) {
        $db->prepare('INSERT INTO reminders (task_id, remind_at) VALUES (?, ?)')
           ->execute(array($taskId, $body['remind_at']));
    }

    return array('ok' => true, 'data' => array('id' => $taskId));
}

// ─── Actualizar tarea ─────────────────────────────────────────────────────────

function updateTask($db, $body) {
    if (!isset($body['id'])) {
        return array('ok' => false, 'error' => 'id is required');
    }

    $id = (int)$body['id'];

    // Campos actualizables
    $allowed = array(
        'title', 'description', 'project_id', 'parent_id', 'section_id',
        'priority', 'due_date', 'due_time', 'recurrence',
        'completed', 'sort_order',
    );

    $sets   = array();
    $params = array(':id' => $id);

    foreach ($allowed as $field) {
        if (array_key_exists($field, $body)) {
            $sets[]          = "$field = :$field";
            $params[":$field"] = $body[$field];
        }
    }

    // Marcar fecha de completado
    if (isset($body['completed'])) {
        if ($body['completed']) {
            $sets[]             = 'completed_at = :completed_at';
            $params[':completed_at'] = date('Y-m-d H:i:s');
        } else {
            $sets[]             = 'completed_at = NULL';
        }
    }

    if (empty($sets)) {
        return array('ok' => false, 'error' => 'nothing to update');
    }

    $sets[] = "updated_at = datetime('now')";
    $sql    = 'UPDATE tasks SET ' . implode(', ', $sets) . ' WHERE id = :id';
    $db->prepare($sql)->execute($params);

    // Actualizar etiquetas si se pasaron
    if (array_key_exists('labels', $body)) {
        setTaskLabels($db, $id, is_array($body['labels']) ? $body['labels'] : array());
    }

    // Manejar recurrencia: si se completó una tarea recurrente, crear la siguiente
    if (isset($body['completed']) && $body['completed']) {
        $task = $db->prepare('SELECT recurrence, due_date FROM tasks WHERE id = ?');
        $task->execute(array($id));
        $task = $task->fetch();
        if ($task && $task['recurrence'] && $task['due_date']) {
            _createNextRecurrence($db, $id, $task);
        }
    }

    return array('ok' => true);
}

/**
 * Crea la siguiente ocurrencia de una tarea recurrente al completarla.
 * La nueva tarea es copia de la original con la nueva fecha de vencimiento.
 */
function _createNextRecurrence($db, $taskId, $task) {
    $nextDate = null;
    switch ($task['recurrence']) {
        case 'daily':   $nextDate = date('Y-m-d', strtotime($task['due_date'] . ' +1 day'));   break;
        case 'weekly':  $nextDate = date('Y-m-d', strtotime($task['due_date'] . ' +1 week'));  break;
        case 'monthly': $nextDate = date('Y-m-d', strtotime($task['due_date'] . ' +1 month')); break;
        case 'yearly':  $nextDate = date('Y-m-d', strtotime($task['due_date'] . ' +1 year'));  break;
    }
    if (!$nextDate) return;

    $orig = $db->prepare('SELECT * FROM tasks WHERE id = ?');
    $orig->execute(array($taskId));
    $orig = $orig->fetch();
    if (!$orig) return;

    $db->prepare(
        'INSERT INTO tasks (project_id, parent_id, section_id, title, description,
                            priority, due_date, due_time, recurrence, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )->execute(array(
        $orig['project_id'], $orig['parent_id'], $orig['section_id'],
        $orig['title'], $orig['description'],
        $orig['priority'], $nextDate, $orig['due_time'], $orig['recurrence'],
        (int)$orig['sort_order'],
    ));
}

// ─── Eliminar tarea ───────────────────────────────────────────────────────────

function deleteTask($db, $id) {
    if (!$id) {
        return array('ok' => false, 'error' => 'id is required');
    }
    // ON DELETE CASCADE elimina sub-tareas, etiquetas y comentarios automáticamente
    $db->prepare('DELETE FROM tasks WHERE id = ?')->execute(array($id));
    return array('ok' => true);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setTaskLabels($db, $taskId, $labelIds) {
    $db->prepare('DELETE FROM task_labels WHERE task_id = ?')->execute(array($taskId));
    if (empty($labelIds)) return;

    $ins = $db->prepare('INSERT OR IGNORE INTO task_labels (task_id, label_id) VALUES (?, ?)');
    foreach ($labelIds as $labelId) {
        $ins->execute(array($taskId, (int)$labelId));
    }
}
