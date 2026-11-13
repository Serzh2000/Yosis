<?php
// Создаёт скрытый курс и в нём цепочку заданий VPL по папкам из tasks/.
// Запуск на сервере Moodle, от пользователя веб-сервера:
//   sudo -u fastuser php -d max_input_vars=5000 create_course.php /путь/к/Moodle /путь/к/tasks "Название курса" КОРОТКОЕ_ИМЯ
// Скрипт можно запускать повторно: уже созданные задания пропускаются.
// Каждое следующее задание открывается, когда за предыдущее набрано не меньше 60 баллов из 100.

define('CLI_SCRIPT', true);
$moodle = $argv[1] ?? '';
$tasksdir = rtrim($argv[2] ?? '', '/');
$fullname = $argv[3] ?? 'Verilog: первые шаги';
$shortname = $argv[4] ?? 'VerilogStart';
$passgrade = 60;
if (!is_file("$moodle/config.php") || !is_dir($tasksdir)) {
    fwrite(STDERR, "Использование: php create_course.php <папка Moodle> <папка tasks> [название] [короткое имя]\n");
    exit(1);
}
require("$moodle/config.php");
require_once("$CFG->dirroot/course/lib.php");
require_once("$CFG->dirroot/course/modlib.php");
require_once("$CFG->dirroot/mod/vpl/locallib.php");
require_once("$CFG->libdir/gradelib.php");

core\session\manager::set_user(get_admin());

// Курс (скрытый, пока преподаватель не откроет его ученикам).
$course = $DB->get_record('course', ['shortname' => $shortname]);
if (!$course) {
    $category = $DB->get_field_select('course_categories', 'MIN(id)', '1=1');
    $course = create_course((object)[
        'fullname' => $fullname,
        'shortname' => $shortname,
        'category' => $category,
        'format' => 'topics',
        'numsections' => 1,
        'visible' => 0,
        'summary' => 'Первые шаги в Verilog: от провода до мультиплексора. Задания открываются по порядку.',
        'summaryformat' => FORMAT_HTML,
    ]);
    echo "Курс создан: id={$course->id}\n";
} else {
    echo "Курс уже есть: id={$course->id}\n";
}

$moduleid = $DB->get_field('modules', 'id', ['name' => 'vpl'], MUST_EXIST);
$defaults = [
    'shortdescription' => '', 'introformat' => FORMAT_HTML, 'startdate' => 0, 'duedate' => 0,
    'maxfiles' => 1, 'maxfilesize' => 0, 'requirednet' => '', 'password' => '',
    'grade' => 100, 'visiblegrade' => 1, 'usevariations' => 0, 'variationtitle' => '', 'basedon' => 0,
    'run' => 1, 'debug' => 0, 'evaluate' => 1, 'evaluateonsubmission' => 0, 'automaticgrading' => 1,
    'maxexetime' => 0, 'restrictededitor' => 0, 'activity_mode' => 0, 'maxexememory' => 0,
    'maxexefilesize' => 0, 'maxexeprocesses' => 0, 'jailservers' => '', 'worktype' => 0,
    'emailteachers' => 0, 'timemodified' => 0, 'freeevaluations' => 0, 'reductionbyevaluation' => '',
    'sebrequired' => 0, 'sebkeys' => '', 'runscript' => '', 'debugscript' => '', 'evaluator' => '',
    'run_mode' => 1, 'evaluation_mode' => 1,
    'showsebdownloadlink' => 1, 'showsebtaskbar' => 1, 'showwificontrol' => 0, 'showreloadbutton' => 1,
    'showtime' => 1, 'showkeyboardlayout' => 1, 'allowuserquitseb' => 1, 'quitpassword' => '',
    'linkquitseb' => '', 'userconfirmquit' => 1, 'allowreloadinexam' => 1, 'enableaudiocontrol' => 0,
    'muteonstartup' => 0, 'allowcapturecamera' => 0, 'allowcapturemicrophone' => 0,
    'allowspellchecking' => 0, 'activateurlfiltering' => 0, 'filterembeddedcontent' => 0,
    'expressionsallowed' => '', 'regexallowed' => '', 'expressionsblocked' => '', 'regexblocked' => '',
];

$common = [];
foreach (['vpl_evaluate.sh', 'vpl_run.sh'] as $name) {
    $path = dirname($tasksdir) . "/$name";
    if (!is_file($path)) {
        fwrite(STDERR, "Нет файла $path\n");
        exit(1);
    }
    $common[$name] = file_get_contents($path);
}

$dirs = glob("$tasksdir/*", GLOB_ONLYDIR);
sort($dirs);
$previousgradeitem = null;
foreach ($dirs as $dir) {
    $title = trim(file_get_contents("$dir/title.txt"));
    $filename = trim(file_get_contents("$dir/file.txt"));
    $existing = $DB->get_record('vpl', ['course' => $course->id, 'name' => $title]);
    if ($existing) {
        echo "Пропуск (уже есть): $title\n";
        $previousgradeitem = $DB->get_field('grade_items', 'id', [
            'courseid' => $course->id, 'itemmodule' => 'vpl', 'iteminstance' => $existing->id, 'itemnumber' => 0,
        ]);
        continue;
    }
    $info = (object)$defaults;
    $info->modulename = 'vpl';
    $info->module = $moduleid;
    $info->course = $course->id;
    $info->section = 1;
    $info->visible = 1;
    $info->visibleoncoursepage = 1;
    $info->name = $title;
    $info->shortdescription = $title;
    $info->intro = file_get_contents("$dir/description.html");
    $info->maxfiles = 1;
    $info->cmidnumber = '';
    $info->groupmode = 0;
    $info->completion = 0;
    if ($previousgradeitem) {
        $info->availability = json_encode((object)[
            'op' => '&',
            'c' => [(object)['type' => 'grade', 'id' => (int)$previousgradeitem, 'min' => $passgrade]],
            'showc' => [true],
        ]);
    }
    $info = add_moduleinfo($info, $course);

    $vpl = new mod_vpl($info->coursemodule);
    $vpl->get_required_fgm()->addallfiles([$filename => file_get_contents("$dir/starter.v")]);
    $vpl->get_execution_fgm()->addallfiles([
        'tb.v' => file_get_contents("$dir/tb.v"),
        'vpl_evaluate.sh' => $common['vpl_evaluate.sh'],
        'vpl_run.sh' => $common['vpl_run.sh'],
    ]);
    // VPL удаляет файлы исполнения перед запуском проверки; тестбенч нужен ей, поэтому его оставляем.
    $vpl->get_execution_fgm()->setfilekeeplist(['tb.v']);
    $previousgradeitem = $DB->get_field('grade_items', 'id', [
        'courseid' => $course->id, 'itemmodule' => 'vpl', 'iteminstance' => $info->instance, 'itemnumber' => 0,
    ]);
    echo "Создано: $title (cmid={$info->coursemodule}, файл ученика $filename)\n";
}
rebuild_course_cache($course->id, true);
echo "Готово. Курс скрыт: https://cdod.sakoryagin.ru/course/view.php?id={$course->id}\n";
