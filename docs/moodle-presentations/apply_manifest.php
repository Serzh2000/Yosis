<?php
// Применяет manifest.json: добавляет презентации в нужные разделы курсов Moodle, старые версии скрывает.
// Запуск от пользователя веб-сервера:
//   sudo -u fastuser php -d max_input_vars=5000 apply_manifest.php /путь/к/Moodle manifest.json /папка/с/файлами dry|apply [КОРОТКОЕ_ИМЯ_КУРСА]
// dry — только показать, что будет сделано. apply — выполнить; журнал изменений пишется в changes-<курс>.json
// рядом с манифестом (там id созданных и скрытых элементов для отката).

define('CLI_SCRIPT', true);
$moodle = $argv[1] ?? '';
$manifestfile = $argv[2] ?? '';
$filesroot = rtrim($argv[3] ?? '', '/');
$mode = $argv[4] ?? 'dry';
$only = $argv[5] ?? null;
if (!is_file("$moodle/config.php") || !is_file($manifestfile) || !is_dir($filesroot)) {
    fwrite(STDERR, "Использование: php apply_manifest.php <Moodle> <manifest.json> <папка файлов> dry|apply [курс]\n");
    exit(1);
}
$apply = ($mode === 'apply');
require("$moodle/config.php");
require_once("$CFG->dirroot/course/lib.php");
require_once("$CFG->dirroot/course/modlib.php");
require_once("$CFG->libdir/filelib.php");

core\session\manager::set_user(get_admin());
set_exception_handler(function ($e) {
    echo get_class($e) . ': ' . $e->getMessage() . "\n" . substr($e->getTraceAsString(), 0, 900) . "\n";
    exit(1);
});

$manifest = json_decode(file_get_contents($manifestfile), true);

function modinfo($course) {
    rebuild_course_cache($course->id, true);
    return get_fast_modinfo($course->id, 0);
}

/** Находит раздел (запись course_sections) по пути: [имя раздела, имя подраздела, ...]. */
function find_section($course, array $path) {
    global $DB;
    $mi = modinfo($course);
    $current = null;
    foreach ($mi->get_section_info_all() as $s) {
        if (empty($s->component) && get_section_name($course, $s) === $path[0]) {
            $current = $s;
            break;
        }
    }
    if (!$current) {
        return null;
    }
    foreach (array_slice($path, 1) as $name) {
        $found = null;
        foreach (($mi->sections[$current->section] ?? []) as $cmid) {
            $cm = $mi->get_cm($cmid);
            if ($cm->modname === 'subsection' && $cm->name === $name) {
                $found = $cm;
                break;
            }
        }
        if (!$found) {
            return null;
        }
        $next = null;
        foreach ($mi->get_section_info_all() as $s) {
            if (($s->component ?? '') === 'mod_subsection' && (int)$s->itemid === (int)$found->instance) {
                $next = $s;
            }
        }
        if (!$next) {
            return null;
        }
        $current = $next;
    }
    return $current;
}

function resource_ext($cm) {
    $ctx = context_module::instance($cm->id);
    foreach (get_file_storage()->get_area_files($ctx->id, 'mod_resource', 'content', 0, 'sortorder', false) as $f) {
        return strtolower(pathinfo($f->get_filename(), PATHINFO_EXTENSION));
    }
    return '';
}

function hide_cm_log($cmid, $apply, &$log, $why) {
    if ($apply) {
        set_coursemodule_visible($cmid, 0);
    }
    $log['hidden'][] = $cmid;
    echo "   скрыть cm$cmid ($why)\n";
}

$all = [];
foreach ($manifest['courses'] as $c) {
    if ($only && $c['shortname'] !== $only) {
        continue;
    }
    echo "\n######## {$c['shortname']} ($mode)\n";
    $log = ['course' => $c['shortname'], 'created' => [], 'hidden' => []];
    $course = $DB->get_record('course', ['shortname' => $c['shortname']]);
    $preexisting = [];
    if ($course) {
        foreach (modinfo($course)->get_cms() as $cm) {
            $preexisting[$cm->id] = true;
        }
    }
    foreach ($c['actions'] as $a) {
        $type = $a['type'];
        if ($type === 'create_course') {
            if ($course) {
                echo "Курс уже есть\n";
                continue;
            }
            echo "создать курс «{$a['fullname']}» (скрытый)\n";
            if ($apply) {
                $cat = $DB->get_field_select('course_categories', 'MIN(id)', '1=1');
                $course = create_course((object)[
                    'fullname' => $a['fullname'], 'shortname' => $a['shortname'], 'category' => $cat,
                    'format' => 'topics', 'numsections' => 2, 'visible' => 0,
                    'summary' => $a['summary'], 'summaryformat' => FORMAT_HTML,
                ]);
                course_create_sections_if_missing($course, [1, 2]);
                $log['created'][] = ['course' => $course->id];
            }
            continue;
        }
        if (!$course) {
            echo "Нет курса {$c['shortname']} (режим dry): пропускаю действие $type\n";
            continue;
        }
        if ($type === 'name_section') {
            echo "раздел {$a['section']} назвать «{$a['name']}»\n";
            if ($apply) {
                course_create_sections_if_missing($course, [$a['section']]);
                $DB->set_field('course_sections', 'name', $a['name'], ['course' => $course->id, 'section' => $a['section']]);
            }
            continue;
        }
        if ($type === 'hide_sections') {
            foreach (modinfo($course)->get_section_info_all() as $s) {
                if (empty($s->component) && $s->name === $a['name'] && empty($s->sequence) && $s->visible) {
                    echo "   скрыть пустой раздел {$s->section} «{$s->name}»\n";
                    if ($apply) {
                        set_section_visible($course->id, $s->section, 0);
                    }
                    $log['hidden'][] = 'section' . $s->section;
                }
            }
            continue;
        }
        if ($type === 'add_subsection') {
            $parent = find_section($course, $a['path']);
            if (!$parent) {
                echo "!! не найден раздел " . implode(' / ', $a['path']) . "\n";
                continue;
            }
            $mi = modinfo($course);
            $exists = false;
            foreach (($mi->sections[$parent->section] ?? []) as $cmid) {
                if ($mi->get_cm($cmid)->modname === 'subsection' && $mi->get_cm($cmid)->name === $a['name']) {
                    $exists = true;
                }
            }
            echo ($exists ? "подраздел уже есть: " : "создать подраздел ") . "«{$a['name']}»\n";
            if ($apply && !$exists) {
                $info = new stdClass();
                $info->modulename = 'subsection';
                $info->module = $DB->get_field('modules', 'id', ['name' => 'subsection'], MUST_EXIST);
                $info->course = $course->id;
                $info->section = $parent->section;
                $info->visible = 1;
                $info->visibleoncoursepage = 1;
                $info->cmidnumber = '';
                $info->name = $a['name'];
                $info->intro = '';
                $info->introformat = FORMAT_HTML;
                $info = add_moduleinfo($info, $course);
                $log['created'][] = ['cm' => $info->coursemodule, 'name' => $a['name']];
            }
            continue;
        }
        if ($type === 'hide_dupes' || $type === 'hide_cm') {
            $sec = find_section($course, $a['path']);
            if (!$sec) {
                echo "!! не найден раздел " . implode(' / ', $a['path']) . "\n";
                continue;
            }
            $mi = modinfo($course);
            $names = $type === 'hide_dupes' ? $a['names'] : [$a['name']];
            foreach ($names as $name) {
                $seen = 0;
                foreach (($mi->sections[$sec->section] ?? []) as $cmid) {
                    $cm = $mi->get_cm($cmid);
                    if ($cm->name !== $name || !isset($preexisting[$cm->id])) {
                        continue;
                    }
                    if (!empty($a['modname']) && $cm->modname !== $a['modname']) {
                        continue;
                    }
                    $seen++;
                    if ($type === 'hide_cm' || $seen > 1) {
                        hide_cm_log($cm->id, $apply, $log, $type === 'hide_cm' ? $name : "дубль «$name»");
                    }
                }
            }
            continue;
        }
        if ($type === 'add' || $type === 'add_to_section') {
            if ($type === 'add') {
                $sec = find_section($course, $a['path']);
                $where = implode(' / ', $a['path']);
            } else {
                course_create_sections_if_missing($course, [$a['section']]);
                $sec = $DB->get_record('course_sections', ['course' => $course->id, 'section' => $a['section']]);
                $where = 'раздел ' . $a['section'];
            }
            if (!$sec) {
                echo "!! не найден раздел " . implode(' / ', $a['path'] ?? []) . " — пропуск «{$a['name']}»\n";
                continue;
            }
            $file = "$filesroot/{$a['file']}";
            if (!is_file($file)) {
                echo "!! нет файла $file\n";
                continue;
            }
            $mi = modinfo($course);
            // Уже добавлен раньше (повторный запуск): пропускаем.
            $already = false;
            foreach (($mi->sections[$sec->section] ?? []) as $cmid) {
                $cm = $mi->get_cm($cmid);
                if ($cm->modname === 'resource' && $cm->name === $a['name'] && !isset($preexisting[$cm->id])) {
                    $already = true;
                }
            }
            if ($already) {
                echo "уже добавлено: «{$a['name']}» → $where\n";
                continue;
            }
            echo "добавить «{$a['name']}» (" . round(filesize($file) / 1048576, 1) . " МБ) → $where\n";
            // Что заменяется: только то, что было в курсе до начала работы.
            $toHide = [];
            foreach (($a['replaces'] ?? []) as $r) {
                foreach (modinfo($course)->get_cms() as $cm) {
                    if (!isset($preexisting[$cm->id]) || $cm->modname !== ($r['modname'] ?? 'resource')
                            || $cm->name !== $r['name']) {
                        continue;
                    }
                    if (!empty($r['in_target']) && (int)$cm->sectionnum !== (int)$sec->section) {
                        continue;
                    }
                    if (!empty($r['ext']) && !in_array(resource_ext($cm), $r['ext'], true)) {
                        continue;
                    }
                    $toHide[$cm->id] = $r['name'];
                }
            }
            if ($apply) {
                global $USER;
                $draft = file_get_unused_draft_itemid();
                get_file_storage()->create_file_from_pathname([
                    'contextid' => context_user::instance($USER->id)->id, 'component' => 'user', 'filearea' => 'draft',
                    'itemid' => $draft, 'filepath' => '/', 'filename' => basename($file),
                ], $file);
                $info = new stdClass();
                $info->modulename = 'resource';
                $info->module = $DB->get_field('modules', 'id', ['name' => 'resource'], MUST_EXIST);
                $info->course = $course->id;
                $info->section = $sec->section;
                $info->visible = 1;
                $info->visibleoncoursepage = 1;
                $info->cmidnumber = '';
                $info->name = $a['name'];
                $info->intro = '';
                $info->introformat = FORMAT_HTML;
                $info->showdescription = 0;
                $info->files = $draft;
                $info->display = 0;
                $info->showsize = 1;
                $info->showtype = 1;
                $info->showdate = 0;
                $info->printintro = 0;
                $info->filterfiles = 0;
                $info = add_moduleinfo($info, $course);
                $log['created'][] = ['cm' => $info->coursemodule, 'name' => $a['name']];
                // Новая презентация идёт первой в разделе.
                $mi = modinfo($course);
                $first = null;
                foreach (($mi->sections[$sec->section] ?? []) as $cmid) {
                    if ($cmid != $info->coursemodule) {
                        $first = $cmid;
                        break;
                    }
                }
                if ($first) {
                    try {
                        \core_courseformat\formatactions::cm($course)->move_before($info->coursemodule, $first);
                    } catch (Throwable $e) {
                        echo "   (не удалось поставить первой: {$e->getMessage()})\n";
                    }
                }
            }
            foreach ($toHide as $cmid => $name) {
                hide_cm_log($cmid, $apply, $log, "старая версия «$name»");
            }
            if (!$toHide && !empty($a['replaces'])) {
                echo "   (заменяемых элементов не найдено)\n";
            }
            continue;
        }
        echo "неизвестное действие $type\n";
    }
    if ($apply && $course) {
        rebuild_course_cache($course->id, true);
    }
    $all[$c['shortname']] = $log;
    if ($apply) {
        file_put_contents(dirname($manifestfile) . "/changes-{$c['shortname']}.json",
            json_encode($log, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    }
}
echo "\nГотово ($mode).\n";
