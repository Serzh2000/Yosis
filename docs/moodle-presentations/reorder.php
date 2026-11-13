<?php
// Ставит созданные apply_manifest.php элементы в начало их разделов (в порядке создания).
// Запуск: sudo -u fastuser php -d max_input_vars=5000 reorder.php /путь/к/Moodle changes-КУРС.json
define('CLI_SCRIPT', true);
$moodle = $argv[1] ?? '';
$changes = json_decode(file_get_contents($argv[2] ?? ''), true);
require("$moodle/config.php");
require_once("$CFG->dirroot/course/lib.php");
core\session\manager::set_user(get_admin());
$course = $DB->get_record('course', ['shortname' => $changes['course']], '*', MUST_EXIST);
$created = [];
foreach ($changes['created'] as $c) {
    if (isset($c['cm'])) {
        $created[] = (int)$c['cm'];
    }
}
rebuild_course_cache($course->id, true);
$mi = get_fast_modinfo($course->id, 0);
$bysection = [];
foreach ($created as $cmid) {
    $bysection[$mi->get_cm($cmid)->sectionnum][] = $cmid;
}
foreach ($bysection as $sectionnum => $ids) {
    $sequence = $mi->sections[$sectionnum] ?? [];
    $others = array_values(array_filter($sequence, fn($id) => !in_array((int)$id, $ids, true)));
    if (!$others) {
        // Раздел состоит только из созданных элементов: выстраиваем их в порядке создания.
        $sectionid = $mi->get_section_info($sectionnum)->id;
        foreach ($ids as $id) {
            \core_courseformat\formatactions::cm($course)->move_end_section($id, $sectionid);
        }
        echo "раздел $sectionnum: " . count($ids) . " элементов выстроены по порядку\n";
        continue;
    }
    foreach ($ids as $id) {
        \core_courseformat\formatactions::cm($course)->move_before($id, (int)$others[0]);
    }
    echo "раздел $sectionnum: " . count($ids) . " элементов поставлено первыми\n";
}
rebuild_course_cache($course->id, true);
