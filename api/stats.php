<?php
/**
 * api/stats.php — Estadísticas de productividad.
 * GET retorna: tasks_today, tasks_week, streak_days, completed_total, by_project[], heatmap[]
 */
require_once __DIR__ . '/../backend/config.php';
require_once __DIR__ . '/../backend/db.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

$db = getDB();

try {
    // Tareas completadas hoy
    $today = date('Y-m-d');
    $tasksToday = (int)$db->prepare(
        "SELECT COUNT(*) FROM tasks WHERE completed = 1 AND date(completed_at) = ?"
    )->execute(array($today)) ? $db->query(
        "SELECT COUNT(*) FROM tasks WHERE completed = 1 AND date(completed_at) = '$today'"
    )->fetchColumn() : 0;

    // Re-query correcta (prepare + fetchColumn en dos pasos para PHP 5.4)
    $stToday = $db->prepare("SELECT COUNT(*) FROM tasks WHERE completed = 1 AND date(completed_at) = ?");
    $stToday->execute(array($today));
    $tasksToday = (int)$stToday->fetchColumn();

    // Tareas completadas esta semana
    $weekStart = date('Y-m-d', strtotime('monday this week'));
    $stWeek    = $db->prepare("SELECT COUNT(*) FROM tasks WHERE completed = 1 AND date(completed_at) >= ?");
    $stWeek->execute(array($weekStart));
    $tasksWeek = (int)$stWeek->fetchColumn();

    // Total completadas
    $completedTotal = (int)$db->query("SELECT COUNT(*) FROM tasks WHERE completed = 1")->fetchColumn();

    // Streak de días consecutivos con al menos 1 tarea completada
    $streakDays = _calculateStreak($db);

    // Por proyecto
    $byProject = $db->query(
        "SELECT p.name, p.color, p.icon,
                COUNT(t.id) AS pending,
                SUM(t.completed) AS done
         FROM projects p
         LEFT JOIN tasks t ON t.project_id = p.id
         WHERE p.archived = 0
         GROUP BY p.id
         ORDER BY pending DESC"
    )->fetchAll();

    // Heatmap: completadas por día en los últimos 90 días
    $heatmap = $db->query(
        "SELECT date(completed_at) AS day, COUNT(*) AS count
         FROM tasks
         WHERE completed = 1
           AND completed_at >= date('now', '-90 days')
         GROUP BY day
         ORDER BY day ASC"
    )->fetchAll();

    // Tareas pendientes totales
    $pendingTotal = (int)$db->query("SELECT COUNT(*) FROM tasks WHERE completed = 0")->fetchColumn();

    echo json_encode(array(
        'ok'   => true,
        'data' => array(
            'tasks_today'     => $tasksToday,
            'tasks_week'      => $tasksWeek,
            'completed_total' => $completedTotal,
            'pending_total'   => $pendingTotal,
            'streak_days'     => $streakDays,
            'by_project'      => $byProject,
            'heatmap'         => $heatmap,
        ),
    ));
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array('ok' => false, 'error' => $e->getMessage()));
}

/**
 * Calcula cuántos días consecutivos hacia atrás el usuario completó al menos 1 tarea.
 * Devuelve 0 si no completó nada hoy ni ayer.
 */
function _calculateStreak($db) {
    $rows = $db->query(
        "SELECT DISTINCT date(completed_at) AS day
         FROM tasks
         WHERE completed = 1 AND completed_at IS NOT NULL
         ORDER BY day DESC
         LIMIT 365"
    )->fetchAll();

    if (empty($rows)) return 0;

    $days = array();
    foreach ($rows as $r) {
        $days[] = $r['day'];
    }

    // El streak solo cuenta si el primer día es hoy o ayer
    $today     = date('Y-m-d');
    $yesterday = date('Y-m-d', strtotime('-1 day'));

    if ($days[0] !== $today && $days[0] !== $yesterday) {
        return 0;
    }

    $streak    = 1;
    $prevDate  = $days[0];

    for ($i = 1; $i < count($days); $i++) {
        $expected = date('Y-m-d', strtotime($prevDate . ' -1 day'));
        if ($days[$i] === $expected) {
            $streak++;
            $prevDate = $days[$i];
        } else {
            break;
        }
    }

    return $streak;
}
