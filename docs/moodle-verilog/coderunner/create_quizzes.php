<?php
// Импортирует вопросы CodeRunner (questions.xml) в курс и создаёт по одному тесту на задание.
// Каждый следующий тест открывается, когда за предыдущий набрано не меньше 60 из 100.
// Запуск от пользователя веб-сервера:
//   sudo -u fastuser php -d max_input_vars=5000 create_quizzes.php /путь/к/Moodle questions.xml КОРОТКОЕ_ИМЯ_КУРСА
// Повторный запуск создаёт только недостающие тесты. Вопросы повторно не импортируются, если уже есть.

define('CLI_SCRIPT', true);
$moodle = $argv[1] ?? '';
$xmlfile = $argv[2] ?? '';
$shortname = $argv[3] ?? 'VerilogStart';
// Необязательно: путь «Раздел|Подраздел» для тестов и параметры: hidden (создать скрытыми), nosuffix (без « (CodeRunner)»).
$sectionpath = !empty($argv[4]) ? explode('|', $argv[4]) : null;
$options = !empty($argv[5]) ? explode(',', $argv[5]) : [];
$passgrade = 60;
if (!is_file("$moodle/config.php") || !is_file($xmlfile)) {
    fwrite(STDERR, "Использование: php create_quizzes.php <папка Moodle> <questions.xml> [имя курса]\n");
    exit(1);
}
require("$moodle/config.php");
require_once("$CFG->dirroot/course/lib.php");
require_once("$CFG->dirroot/course/modlib.php");
require_once("$CFG->dirroot/mod/quiz/locallib.php");
require_once("$CFG->dirroot/question/format.php");
require_once("$CFG->dirroot/question/format/xml/format.php");
require_once("$CFG->libdir/gradelib.php");

core\session\manager::set_user(get_admin());
set_exception_handler(function ($e) {
    echo get_class($e) . ': ' . $e->getMessage() . "\n" . $e->getTraceAsString() . "\n";
    exit(1);
});
$course = $DB->get_record('course', ['shortname' => $shortname], '*', MUST_EXIST);
$coursecontext = context_course::instance($course->id);
// CodeRunner ищет прототипы в системном банке вопросов сайта; создаём его, если нет.
\core_question\local\bank\question_bank_helper::get_default_open_instance_system_type(get_site(), true);
// В Moodle 5 вопросы лежат в банке вопросов курса (модуль qbank), а не в контексте курса.
$qbankcm = \core_question\local\bank\question_bank_helper::get_default_open_instance_system_type($course, true);
$qbankcontext = context_module::instance($qbankcm->id);

// Адрес песочницы Jobe (qtype_coderunner/jobe_host) здесь не трогаем: он настроен отдельно, см. README.

// Импорт вопросов, если их ещё нет.
$names = [];
$xml = simplexml_load_file($xmlfile);
foreach ($xml->question as $q) {
    if ((string)$q['type'] === 'coderunner' && (string)$q->prototypetype === '0') {
        $names[] = (string)$q->name->text;
    }
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
if (!$find($names[0])) {
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
    if (!$ok) {
        exit(1);
    }
} else {
    echo "Вопросы уже есть в курсе\n";
}

// Раздел для тестов: либо подраздел по пути «Раздел|Подраздел», либо раздел 2 курса.
if ($sectionpath) {
    $mi = get_fast_modinfo($course->id, 0);
    $current = null;
    foreach ($mi->get_section_info_all() as $s) {
        if (empty($s->component) && get_section_name($course, $s) === $sectionpath[0]) {
            $current = $s;
        }
    }
    foreach (array_slice($sectionpath, 1) as $subname) {
        $next = null;
        foreach (($mi->sections[$current->section] ?? []) as $cmid) {
            $cm = $mi->get_cm($cmid);
            if ($cm->modname === 'subsection' && $cm->name === $subname) {
                foreach ($mi->get_section_info_all() as $s) {
                    if (($s->component ?? '') === 'mod_subsection' && (int)$s->itemid === (int)$cm->instance) {
                        $next = $s;
                    }
                }
            }
        }
        if (!$next) {
            fwrite(STDERR, "Не найден подраздел $subname\n");
            exit(1);
        }
        $current = $next;
    }
    if (!$current) {
        fwrite(STDERR, "Не найден раздел\n");
        exit(1);
    }
    $sectionnum = $current->section;
} else {
    course_create_sections_if_missing($course, [2]);
    $section = $DB->get_record('course_sections', ['course' => $course->id, 'section' => 2], '*', MUST_EXIST);
    if (empty($section->name)) {
        $DB->set_field('course_sections', 'name', 'Задания с проверкой кода (CodeRunner)', ['id' => $section->id]);
    }
    $sectionnum = 2;
}

$moduleid = $DB->get_field('modules', 'id', ['name' => 'quiz'], MUST_EXIST);
$previousgradeitem = null;
foreach ($names as $name) {
    $quizname = in_array('nosuffix', $options, true) ? $name : $name . ' (CodeRunner)';
    $existing = $DB->get_record('quiz', ['course' => $course->id, 'name' => $quizname]);
    if ($existing) {
        echo "Пропуск (уже есть): $quizname\n";
        \mod_quiz\quiz_settings::create($existing->id)->get_grade_calculator()->recompute_quiz_sumgrades();
        $previousgradeitem = $DB->get_field('grade_items', 'id', [
            'courseid' => $course->id, 'itemmodule' => 'quiz', 'iteminstance' => $existing->id, 'itemnumber' => 0,
        ]);
        continue;
    }
    $questionid = $find($name);
    if (!$questionid) {
        fwrite(STDERR, "Нет вопроса $name\n");
        exit(1);
    }
    $info = new stdClass();
    $info->modulename = 'quiz';
    $info->module = $moduleid;
    $info->course = $course->id;
    $info->section = $sectionnum;
    $info->visible = in_array('hidden', $options, true) ? 0 : 1;
    $info->visibleoncoursepage = 1;
    $info->cmidnumber = '';
    $info->groupmode = 0;
    $info->completion = 0;
    $info->name = $quizname;
    $info->intro = '<p>Допишите код, нажмите «Проверить». Когда все проверки зелёные, нажмите «Закончить попытку…».</p>';
    $info->introformat = FORMAT_HTML;
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
    $info = add_moduleinfo($info, $course);
    $quiz = $DB->get_record('quiz', ['id' => $info->instance], '*', MUST_EXIST);
    $quiz->cmid = $info->coursemodule;
    quiz_add_quiz_question($questionid, $quiz, 0);
    \mod_quiz\quiz_settings::create($quiz->id)->get_grade_calculator()->recompute_quiz_sumgrades();
    $previousgradeitem = $DB->get_field('grade_items', 'id', [
        'courseid' => $course->id, 'itemmodule' => 'quiz', 'iteminstance' => $quiz->id, 'itemnumber' => 0,
    ]);
    echo "Создан тест: $quizname (cmid={$info->coursemodule})\n";
}
rebuild_course_cache($course->id, true);
echo "Готово.\n";
