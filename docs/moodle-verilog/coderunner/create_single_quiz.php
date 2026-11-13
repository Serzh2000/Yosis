<?php
// Собирает ОДИН тест из вопросов CodeRunner (по одному вопросу на странице) в подразделе курса.
// Вопросы уже должны быть импортированы (create_quizzes.php). Запуск от пользователя веб-сервера:
//   sudo -u fastuser php -d max_input_vars=5000 create_single_quiz.php /путь/к/Moodle questions.xml "ТСП" \
//     "Раздел|Подраздел" "Название теста" [hidden]

define('CLI_SCRIPT', true);
$moodle = $argv[1] ?? '';
$xmlfile = $argv[2] ?? '';
$shortname = $argv[3] ?? '';
$sectionpath = explode('|', $argv[4] ?? '');
$quizname = $argv[5] ?? 'Verilog: первые шаги';
$hidden = ($argv[6] ?? '') === 'hidden';
if (!is_file("$moodle/config.php") || !is_file($xmlfile) || !$shortname) {
    fwrite(STDERR, "Использование: php create_single_quiz.php <Moodle> <questions.xml> <курс> <Раздел|Подраздел> <название> [hidden]\n");
    exit(1);
}
require("$moodle/config.php");
require_once("$CFG->dirroot/course/lib.php");
require_once("$CFG->dirroot/course/modlib.php");
require_once("$CFG->dirroot/mod/quiz/locallib.php");
require_once("$CFG->libdir/gradelib.php");

core\session\manager::set_user(get_admin());
set_exception_handler(function ($e) {
    echo get_class($e) . ': ' . $e->getMessage() . "\n" . $e->getTraceAsString() . "\n";
    exit(1);
});
$course = $DB->get_record('course', ['shortname' => $shortname], '*', MUST_EXIST);
$qbankcm = \core_question\local\bank\question_bank_helper::get_default_open_instance_system_type($course, true);
$qbankcontext = context_module::instance($qbankcm->id);

// Имена вопросов (кроме прототипа) из questions.xml, в порядке файла.
$names = [];
foreach (simplexml_load_file($xmlfile)->question as $q) {
    if ((string)$q['type'] === 'coderunner' && (string)$q->prototypetype === '0') {
        $names[] = (string)$q->name->text;
    }
}
$questionids = [];
foreach ($names as $name) {
    $id = $DB->get_field_sql(
        'SELECT q.id FROM {question} q
           JOIN {question_versions} qv ON qv.questionid = q.id
           JOIN {question_bank_entries} qbe ON qbe.id = qv.questionbankentryid
           JOIN {question_categories} qc ON qc.id = qbe.questioncategoryid
          WHERE q.name = :n AND qc.contextid = :c
       ORDER BY qv.version DESC',
        ['n' => $name, 'c' => $qbankcontext->id], IGNORE_MULTIPLE);
    if (!$id) {
        fwrite(STDERR, "Нет вопроса «$name» в банке курса. Сначала импортируйте вопросы (create_quizzes.php).\n");
        exit(1);
    }
    $questionids[$name] = $id;
}

// Раздел назначения.
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
if ($DB->record_exists('quiz', ['course' => $course->id, 'name' => $quizname])) {
    echo "Тест «$quizname» уже есть, пропуск\n";
    exit(0);
}

$info = new stdClass();
$info->modulename = 'quiz';
$info->module = $DB->get_field('modules', 'id', ['name' => 'quiz'], MUST_EXIST);
$info->course = $course->id;
$info->section = $current->section;
$info->visible = $hidden ? 0 : 1;
$info->visibleoncoursepage = 1;
$info->cmidnumber = '';
$info->groupmode = 0;
$info->completion = 0;
$info->name = $quizname;
$info->intro = '<p>Пять заданий по порядку, от простого к сложному. В каждом допишите код и нажмите «Проверить»; '
    . 'когда все проверки зелёные, переходите к следующему заданию. В конце нажмите «Закончить попытку…», '
    . 'чтобы оценка записалась в журнал.</p>';
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
$info = add_moduleinfo($info, $course);
$quiz = $DB->get_record('quiz', ['id' => $info->instance], '*', MUST_EXIST);
$quiz->cmid = $info->coursemodule;
$page = 1;
foreach ($questionids as $name => $qid) {
    quiz_add_quiz_question($qid, $quiz, $page++);
}
\mod_quiz\quiz_settings::create($quiz->id)->get_grade_calculator()->recompute_quiz_sumgrades();
rebuild_course_cache($course->id, true);
echo "Создан тест «$quizname» (cmid={$info->coursemodule}), вопросов: " . count($questionids) . "\n";
