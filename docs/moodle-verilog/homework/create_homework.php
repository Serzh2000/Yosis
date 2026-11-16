<?php
// Загружает домашние задания по Verilog в курс Moodle и строит папки/тесты в подразделе.
// Запуск от пользователя веб-сервера:
//   sudo -u fastuser php -d max_input_vars=5000 create_homework.php /путь/к/Moodle questions.xml homework.json РЕЖИМ [КУРС] [Раздел|Подраздел]
// Режимы:
//   import     импортировать вопросы в банк курса (если ещё нет)
//   test       прогнать эталонные ответы всех вопросов через CodeRunner и показать оценки
//   structure  создать в подразделе папки с презентациями групп и тесты «ДЗ N» (скрытые), убрать одиночные презентации

define('CLI_SCRIPT', true);
$moodle = $argv[1] ?? '';
$xmlfile = $argv[2] ?? '';
$hwfile = $argv[3] ?? '';
$mode = $argv[4] ?? 'test';
$shortname = $argv[5] ?? 'ТСП';
$sectionpath = explode('|', $argv[6] ?? 'Блок 3. Электроника и микропроцессорная техника|3.4. Проектирование электроники');
$passgrade = 60;
if (!is_file("$moodle/config.php") || !is_file($xmlfile) || !is_file($hwfile)) {
    fwrite(STDERR, "Использование: php create_homework.php <Moodle> <questions.xml> <homework.json> import|test|structure [курс] [раздел|подраздел]\n");
    exit(1);
}
require("$moodle/config.php");
require_once("$CFG->dirroot/course/lib.php");
require_once("$CFG->dirroot/course/modlib.php");
require_once("$CFG->dirroot/mod/quiz/locallib.php");
require_once("$CFG->dirroot/question/engine/lib.php");
require_once("$CFG->dirroot/question/format.php");
require_once("$CFG->dirroot/question/format/xml/format.php");
require_once("$CFG->libdir/gradelib.php");
require_once("$CFG->libdir/filelib.php");

core\session\manager::set_user(get_admin());
set_exception_handler(function ($e) {
    echo get_class($e) . ': ' . $e->getMessage() . "\n" . substr($e->getTraceAsString(), 0, 1200) . "\n";
    exit(1);
});
$course = $DB->get_record('course', ['shortname' => $shortname], '*', MUST_EXIST);
$coursecontext = context_course::instance($course->id);
$qbankcm = \core_question\local\bank\question_bank_helper::get_default_open_instance_system_type($course, true);
$qbankcontext = context_module::instance($qbankcm->id);
$hw = json_decode(file_get_contents($hwfile), true);

$xml = simplexml_load_file($xmlfile);
$questions = [];   // name => ['answer' => ..., 'proto' => bool]
foreach ($xml->question as $q) {
    if ((string)$q['type'] !== 'coderunner') {
        continue;
    }
    $questions[(string)$q->name->text] = ['answer' => (string)$q->answer, 'proto' => (string)$q->prototypetype !== '0'];
}
$find = function (string $name) use ($DB, $qbankcontext) {
    return $DB->get_field_sql(
        'SELECT q.id FROM {question} q
           JOIN {question_versions} qv ON qv.questionid = q.id
           JOIN {question_bank_entries} qbe ON qbe.id = qv.questionbankentryid
           JOIN {question_categories} qc ON qc.id = qbe.questioncategoryid
          WHERE q.name = :n AND qc.contextid = :c
       ORDER BY qv.version DESC',
        ['n' => $name, 'c' => $qbankcontext->id], IGNORE_MULTIPLE);
};

function new_module_simple($course, $modname, $info) {
    global $DB;
    $info->modulename = $modname;
    $info->module = $DB->get_field('modules', 'id', ['name' => $modname], MUST_EXIST);
    $info->course = $course->id;
    $info->cmidnumber = '';
    $info->visibleoncoursepage = 1;
    return add_moduleinfo($info, $course);
}

/** Находит раздел (запись course_sections) по пути «Раздел|Подраздел». */
function find_section_by_path($course, array $path) {
    $mi = get_fast_modinfo($course->id, 0);
    $current = null;
    foreach ($mi->get_section_info_all() as $s) {
        if (empty($s->component) && get_section_name($course, $s) === $path[0]) {
            $current = $s;
        }
    }
    foreach (array_slice($path, 1) as $name) {
        $next = null;
        foreach (($mi->sections[$current->section] ?? []) as $cmid) {
            $cm = $mi->get_cm($cmid);
            if ($cm->modname === 'subsection' && $cm->name === $name) {
                foreach ($mi->get_section_info_all() as $s) {
                    if (($s->component ?? '') === 'mod_subsection' && (int)$s->itemid === (int)$cm->instance) {
                        $next = $s;
                    }
                }
            }
        }
        if (!$next) {
            fwrite(STDERR, "Не найден подраздел $name\n");
            exit(1);
        }
        $current = $next;
    }
    return $current;
}

if ($mode === 'import') {
    $first = array_key_first(array_filter($questions, fn($v) => !$v['proto']));
    if (getenv('HW_REPLACE')) {
        // Обновление: вопросы с такими же именами сначала удаляются из банка (если не стоят в тестах — иначе скрываются).
        foreach ($questions as $name => $info) {
            if (!$info['proto'] && ($old = $find($name))) {
                question_delete_question($old);
                echo "Удалён прежний вопрос: $name\n";
            }
        }
    } else if ($find($first)) {
        echo "Вопросы уже есть в банке курса (для обновления: HW_REPLACE=1)\n";
        exit(0);
    }
    $category = question_get_default_category($qbankcontext->id, true);
    $qformat = new qformat_xml();
    $qformat->setCategory($category);
    $qformat->setContexts([$qbankcontext]);
    $qformat->setCourse($course);
    $qformat->setFilename($xmlfile);
    $qformat->setRealfilename(basename($xmlfile));
    $qformat->setMatchgrades('error');
    $qformat->setCatfromfile(false);
    $qformat->setContextfromfile(false);
    $qformat->setStoponerror(true);
    ob_start();
    $ok = $qformat->importpreprocess() && $qformat->importprocess() && $qformat->importpostprocess();
    $log = strip_tags(ob_get_clean());
    echo $ok ? "Вопросы импортированы\n" : "ОШИБКА импорта:\n$log\n";
    exit($ok ? 0 : 1);
}

if ($mode === 'texts') {
    // Обновить шаблоны и тексты условий уже существующих вопросов (они стоят в тестах, поэтому не пересоздаются).
    // Метки @@L<n>@@ в тексте заменяются адресами презентаций уроков, найденных в курсе.
    $urls = [];
    $mi = get_fast_modinfo($course->id, 0);
    foreach (($hw['lessons'] ?? []) as $n => $lname) {
        foreach ($mi->get_cms() as $cm) {
            if ($cm->modname === 'resource' && $cm->name === $lname && $cm->visible) {
                $urls[$n] = $CFG->wwwroot . '/mod/resource/view.php?id=' . $cm->id;
            }
        }
    }
    foreach ($xml->question as $q) {
        if ((string)$q['type'] !== 'coderunner' || (string)$q->prototypetype !== '0') {
            continue;
        }
        $name = (string)$q->name->text;
        $id = $find($name);
        if (!$id) {
            echo "НЕТ вопроса $name\n";
            continue;
        }
        $text = preg_replace_callback('/@@L(\d+)@@/', function ($m) use ($urls) {
            return $urls[(int)$m[1]] ?? '#';
        }, (string)$q->questiontext->text);
        $DB->set_field('question_coderunner_options', 'template', (string)$q->template, ['questionid' => $id]);
        $DB->set_field('question', 'questiontext', $text, ['id' => $id]);
        $DB->set_field('question', 'timemodified', time(), ['id' => $id]);
        echo "обновлён: $name" . (strpos($text, '"#"') !== false ? ' (есть ссылки без адреса!)' : '') . "\n";
    }
    purge_all_caches();
    exit(0);
}

if ($mode === 'restructure') {
    // Из плоского подраздела 3.4 (страница, папки, тесты) делаем «3.4.1 … 3.4.7»: в каждой части презентации и
    // домашнее задание. Подраздел внутри подраздела в Moodle нельзя, поэтому части идут подряд за 3.4.
    global $USER;
    $mi = get_fast_modinfo($course->id, 0);
    $fs = get_file_storage();
    $block = null;
    foreach ($mi->get_section_info_all() as $s) {
        if (empty($s->component) && get_section_name($course, $s) === $sectionpath[0]) {
            $block = $s;
        }
    }
    $s34 = find_section_by_path($course, $sectionpath);
    $folders = [];
    $quizzes = [];
    $page = null;
    foreach (($mi->sections[$s34->section] ?? []) as $cmid) {
        $cm = $mi->get_cm($cmid);
        if ($cm->modname === 'folder') {
            $folders[$cm->name] = $cm;
        } else if ($cm->modname === 'quiz' && strpos($cm->name, 'ДЗ ') === 0) {
            $quizzes[$cm->name] = $cm;
        } else if ($cm->modname === 'page') {
            $page = $cm;
        }
    }
    foreach ($hw['groups'] as $g) {
        $folder = null;
        $quiz = null;
        foreach ($folders as $n => $cm) {
            if (strpos($n, 'Группа ' . $g['id'] . '. ') === 0) {
                $folder = $cm;
            }
        }
        foreach ($quizzes as $n => $cm) {
            if (strpos($n, 'ДЗ ' . $g['id'] . '. ') === 0) {
                $quiz = $cm;
            }
        }
        $subname = '3.4.' . $g['id'] . '. ' . $g['title'];
        $mi = get_fast_modinfo($course->id, 0);
        $subcm = null;
        foreach (($mi->sections[$block->section] ?? []) as $cmid) {
            $cm = $mi->get_cm($cmid);
            if ($cm->modname === 'subsection' && $cm->name === $subname) {
                $subcm = $cm;
            }
        }
        if (!$subcm) {
            $info = new stdClass();
            $info->section = $block->section;
            $info->visible = 1;
            $info->name = $subname;
            $info->intro = '';
            $info->introformat = FORMAT_HTML;
            $r = new_module_simple($course, 'subsection', $info);
            echo "Подраздел: $subname\n";
        }
        $dsec = find_section_by_path($course, [$sectionpath[0], $subname]);
        // презентации из папки: каждая отдельным элементом «Файл»
        if ($folder) {
            $fctx = context_module::instance($folder->id);
            $files = $fs->get_area_files($fctx->id, 'mod_folder', 'content', 0, 'filename', false);
            foreach ($g['lessons'] as $lname) {
                $mi = get_fast_modinfo($course->id, 0);
                $exists = false;
                foreach (($mi->sections[$dsec->section] ?? []) as $cmid) {
                    if ($mi->get_cm($cmid)->name === $lname) {
                        $exists = true;
                    }
                }
                if ($exists) {
                    continue;
                }
                foreach ($files as $f) {
                    if (strpos($f->get_filename(), $lname) !== 0) {
                        continue;
                    }
                    $draft = file_get_unused_draft_itemid();
                    $fs->create_file_from_storedfile([
                        'contextid' => context_user::instance($USER->id)->id, 'component' => 'user', 'filearea' => 'draft',
                        'itemid' => $draft, 'filepath' => '/', 'filename' => $f->get_filename(),
                    ], $f);
                    $info = new stdClass();
                    $info->section = $dsec->section;
                    $info->visible = 1;
                    $info->name = $lname;
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
                    new_module_simple($course, 'resource', $info);
                    echo "  презентация: $lname\n";
                    break;
                }
            }
        }
        if ($quiz) {
            \core_courseformat\formatactions::cm($course)->move_end_section($quiz->id, $dsec->id);
            \core_courseformat\formatactions::cm($course)->rename($quiz->id, 'Домашнее задание');
            echo "  домашнее задание перенесено\n";
        }
        if ($folder) {
            course_delete_module($folder->id);
            echo "  папка удалена (в корзине Moodle)\n";
        }
    }
    // страница «как работать» остаётся в 3.4 и описывает новую структуру
    if ($page) {
        $text = '<p>Здесь собрано всё про цифровую электронику и Verilog: от первого модуля до передатчика UART. Материал разбит '
            . 'на семь частей, 3.4.1–3.4.7. В каждой сначала презентации, потом домашнее задание. Читайте по порядку: задания '
            . 'опираются только на то, что уже было в презентациях.</p>'
            . '<p>Внутри домашнего задания всё идёт от лёгкого к сложному. Сначала нужно дописать одну строчку, потом исправить '
            . 'готовый код, потом написать модуль по описанию, а ближе к концу вы сами решаете, как устроить схему. Над каждым '
            . 'заданием есть ссылки на презентации, которые для него нужны.</p>'
            . '<p>Кнопка «Проверить» прогоняет вашу схему на наборе входов и показывает, где результат не совпал с ожидаемым. '
            . 'Пробовать можно сколько угодно. Когда все проверки зелёные, нажмите «Закончить попытку…», иначе оценка не '
            . 'запишется. Следующая часть откроется, когда за предыдущую набрано не меньше 60 баллов из 100.</p>';
        $rec = $DB->get_record('page', ['id' => $page->instance], '*', MUST_EXIST);
        $rec->content = $text;
        $rec->contentformat = FORMAT_HTML;
        $rec->revision = $rec->revision + 1;
        $rec->timemodified = time();
        $DB->update_record('page', $rec);
        echo "Страница «как работать» обновлена\n";
    }
    rebuild_course_cache($course->id, true);
    exit(0);
}

if ($mode === 'test') {
    $bad = 0;
    foreach ($questions as $name => $info) {
        if ($info['proto']) {
            continue;
        }
        $id = $find($name);
        if (!$id) {
            echo "НЕТ вопроса $name\n";
            $bad++;
            continue;
        }
        $q = question_bank::load_question($id);
        $quba = question_engine::make_questions_usage_by_activity('mod_quiz', $coursecontext);
        $quba->set_preferred_behaviour('adaptive_adapted_for_coderunner');
        $slot = $quba->add_question($q, 1);
        $quba->start_all_questions();
        $quba->process_action($slot, ['answer' => $info['answer'], '-submit' => 1]);
        $mark = (float)$quba->get_question_attempt($slot)->get_mark();
        $ok = abs($mark - 1.0) < 1e-6;
        echo ($ok ? 'ok  ' : 'ОШ  ') . $name . ' => ' . round($mark, 2) . "\n";
        $bad += $ok ? 0 : 1;
    }
    echo $bad ? "ЕСТЬ ОШИБКИ: $bad\n" : "Все эталонные ответы проходят в песочнице Moodle\n";
    exit($bad ? 1 : 0);
}

if ($mode !== 'structure') {
    fwrite(STDERR, "Неизвестный режим $mode\n");
    exit(1);
}

// ---------------------------------------------------------------- структура
global $USER;
$log = ['created' => [], 'deleted' => []];
$section = find_section_by_path($course, $sectionpath);
$mi = get_fast_modinfo($course->id, 0);
$fs = get_file_storage();

// презентации (одиночные «Файл»), которые лежат в подразделе
$resources = [];
foreach (($mi->sections[$section->section] ?? []) as $cmid) {
    $cm = $mi->get_cm($cmid);
    if ($cm->modname === 'resource') {
        $resources[$cm->name] = $cm;
    }
}
$oldquizzes = [];
foreach (($mi->sections[$section->section] ?? []) as $cmid) {
    $cm = $mi->get_cm($cmid);
    if ($cm->modname === 'quiz') {
        $oldquizzes[$cm->id] = $cm->name;
    }
}

function new_module($course, $modname, $info) {
    global $DB;
    $info->modulename = $modname;
    $info->module = $DB->get_field('modules', 'id', ['name' => $modname], MUST_EXIST);
    $info->course = $course->id;
    $info->cmidnumber = '';
    $info->visibleoncoursepage = 1;
    return add_moduleinfo($info, $course);
}

// 0. страница «как работать»
$levels = [
    1 => 'по образцу: допишите пропуск', 2 => 'исправьте или измените готовый код',
    3 => 'по описанию: порты заданы, содержимое пишете вы', 4 => 'по задаче: интерфейс задан, устройство продумываете сами',
    5 => 'комплексное: несколько идей из разных уроков',
];
$rows = '';
foreach ($hw['groups'] as $g) {
    $rows .= '<tr><td>' . $g['id'] . '</td><td>' . s($g['title']) . '</td><td>' . s(implode('; ', $g['lessons'])) . '</td><td>'
        . count($g['questions']) . '</td></tr>';
}
$levelrows = '';
foreach ($levels as $n => $t) {
    $levelrows .= "<li><b>$n.</b> $t</li>";
}
$pagehtml = '<p>Курс разбит на 7 групп. В каждой группе: <b>папка с презентациями</b> и <b>тест «ДЗ N»</b> с домашними заданиями '
    . 'по этим презентациям. Сначала прочитайте презентации группы, потом приступайте к заданиям.</p>'
    . '<p>Задания внутри теста идут от простых к сложным; чем дальше, тем больше вы делаете сами:</p><ol>' . $levelrows . '</ol>'
    . '<p>В каждом задании указано, на какие уроки оно опирается. Нажимайте «Проверить»: проверка покажет, на каких наборах входов '
    . 'решение работает неверно. Попыток можно сколько угодно. Группы открываются по порядку: следующий тест откроется, когда за '
    . 'предыдущий набрано не меньше 60 из 100.</p>'
    . '<table border="1" cellpadding="4"><tr><th>№</th><th>Группа</th><th>Презентации</th><th>Заданий</th></tr>' . $rows . '</table>';
$info = new stdClass();
$info->section = $section->section;
$info->visible = 1;
$info->name = 'Как работать с заданиями (читать первым)';
$info->intro = '';
$info->introformat = FORMAT_HTML;
$info->page = ['text' => $pagehtml, 'format' => FORMAT_HTML, 'itemid' => 0];
$info->content = $pagehtml;
$info->contentformat = FORMAT_HTML;
$info->display = 5;
$info->printintro = 0;
$info->printlastmodified = 0;
$info->displayoptions = serialize(['printintro' => 0, 'printlastmodified' => 0]);
$info->revision = 1;
$r = new_module($course, 'page', $info);
$log['created'][] = ['cm' => $r->coursemodule, 'name' => $info->name];
echo "Страница: {$info->name}\n";

$previousgradeitem = null;
foreach ($hw['groups'] as $g) {
    // 1. папка с презентациями
    $draft = file_get_unused_draft_itemid();
    $names = [];
    foreach ($g['lessons'] as $lname) {
        if (!isset($resources[$lname])) {
            echo "!! нет презентации «$lname» в подразделе\n";
            continue;
        }
        $rctx = context_module::instance($resources[$lname]->id);
        foreach ($fs->get_area_files($rctx->id, 'mod_resource', 'content', 0, 'sortorder', false) as $f) {
            $fs->create_file_from_storedfile([
                'contextid' => context_user::instance($USER->id)->id, 'component' => 'user', 'filearea' => 'draft',
                'itemid' => $draft, 'filepath' => '/', 'filename' => $f->get_filename(),
            ], $f);
            $names[] = $f->get_filename();
        }
    }
    $info = new stdClass();
    $info->section = $section->section;
    $info->visible = 1;
    $info->name = 'Группа ' . $g['id'] . '. ' . $g['title'] . ': презентации';
    $info->intro = '<p>Презентации этой группы. После них выполните тест «ДЗ ' . $g['id'] . '».</p>';
    $info->introformat = FORMAT_HTML;
    $info->showexpanded = 1;
    $info->showdownloadfolder = 1;
    $info->forcedownload = 1;
    $info->files = $draft;
    $info->revision = 1;
    $r = new_module($course, 'folder', $info);
    $log['created'][] = ['cm' => $r->coursemodule, 'name' => $info->name, 'files' => $names];
    echo "Папка: {$info->name} (" . count($names) . " файл.)\n";

    // 2. тест ДЗ
    $qids = [];
    foreach ($g['questions'] as $qn) {
        $id = $find($qn);
        if (!$id) {
            fwrite(STDERR, "Нет вопроса $qn: сначала режим import\n");
            exit(1);
        }
        $qids[$qn] = $id;
    }
    $quizname = 'ДЗ ' . $g['id'] . '. ' . $g['title'];
    $info = new stdClass();
    $info->section = $section->section;
    $info->visible = 0;
    $info->name = $quizname;
    $info->intro = '<p>Домашние задания к презентациям группы ' . $g['id'] . '. Задания идут от простых к сложным; в конце нажмите '
        . '«Закончить попытку…», чтобы оценка записалась в журнал.</p>';
    $info->introformat = FORMAT_HTML;
    $info->groupmode = 0;
    $info->completion = 0;
    $info->timeopen = 0;
    $info->timeclose = 0;
    $info->timelimit = 0;
    $info->overduehandling = 'autosubmit';
    $info->graceperiod = 0;
    $info->preferredbehaviour = 'adaptive_adapted_for_coderunner';
    $info->canredoquestions = 0;
    $info->attempts = 0;
    $info->attemptonlast = 0;
    $info->grademethod = QUIZ_GRADEHIGHEST;
    $info->decimalpoints = 0;
    $info->questiondecimalpoints = -1;
    foreach (['during', 'immediately', 'open', 'closed'] as $when) {
        foreach (['attempt', 'correctness', 'maxmarks', 'marks', 'specificfeedback', 'generalfeedback',
                  'rightanswer', 'overallfeedback'] as $what) {
            $info->{$what . $when} = ($what === 'overallfeedback' && $when === 'during') ? 0 : 1;
        }
    }
    $info->questionsperpage = 1;
    $info->navmethod = QUIZ_NAVMETHOD_FREE;
    $info->shuffleanswers = 0;
    $info->sumgrades = 0;
    $info->grade = 100;
    $info->quizpassword = '';
    $info->subnet = '';
    $info->browsersecurity = '-';
    $info->delay1 = 0;
    $info->delay2 = 0;
    $info->showuserpicture = 0;
    $info->showblocks = 0;
    $info->timecreated = time();
    $info->timemodified = time();
    if ($previousgradeitem) {
        $info->availability = json_encode((object)[
            'op' => '&',
            'c' => [(object)['type' => 'grade', 'id' => (int)$previousgradeitem, 'min' => $passgrade]],
            'showc' => [true],
        ]);
    }
    $r = new_module($course, 'quiz', $info);
    $quiz = $DB->get_record('quiz', ['id' => $r->instance], '*', MUST_EXIST);
    $quiz->cmid = $r->coursemodule;
    $page = 1;
    foreach ($qids as $qid) {
        quiz_add_quiz_question($qid, $quiz, $page++);
    }
    \mod_quiz\quiz_settings::create($quiz->id)->get_grade_calculator()->recompute_quiz_sumgrades();
    $previousgradeitem = $DB->get_field('grade_items', 'id', [
        'courseid' => $course->id, 'itemmodule' => 'quiz', 'iteminstance' => $quiz->id, 'itemnumber' => 0,
    ]);
    $log['created'][] = ['cm' => $r->coursemodule, 'name' => $quizname, 'questions' => count($qids)];
    echo "Тест: $quizname (" . count($qids) . " вопросов)\n";
}

// 3. убрать одиночные презентации (теперь они в папках) и прежний тест на пять заданий
foreach ($resources as $name => $cm) {
    course_delete_module($cm->id);
    $log['deleted'][] = ['cm' => $cm->id, 'name' => $name];
}
foreach ($oldquizzes as $cmid => $name) {
    if (strpos($name, 'ДЗ ') === 0) {
        continue;
    }
    $quizid = $DB->get_field('course_modules', 'instance', ['id' => $cmid]);
    if ($DB->count_records('quiz_attempts', ['quiz' => $quizid])) {
        echo "Тест «$name» оставлен: в нём есть попытки\n";
        continue;
    }
    course_delete_module($cmid);
    $log['deleted'][] = ['cm' => $cmid, 'name' => $name];
    echo "Удалён прежний тест «$name»\n";
}
rebuild_course_cache($course->id, true);
file_put_contents(dirname($hwfile) . '/changes-homework.json', json_encode($log, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
echo "Готово. Удалено одиночных презентаций: " . count($resources) . " (они в корзине Moodle)\n";
