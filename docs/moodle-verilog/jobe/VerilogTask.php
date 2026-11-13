<?php
// Язык Verilog для песочницы Jobe (CodeRunner): компиляция iverilog, запуск vvp.
// Кладётся в app/Libraries/VerilogTask.php. Имя языка в CodeRunner: verilog.

namespace Jobe;

class VerilogTask extends LanguageTask
{
    public function __construct($filename, $input, $params)
    {
        parent::__construct($filename, $input, $params);
        $this->default_params['compileargs'] = array('-g2012', '-Wall', '-Wno-timescale');
        $this->default_params['interpreterargs'] = array('-n');
    }

    public static function getVersionCommand()
    {
        return array('iverilog -V', '/Icarus Verilog version ([0-9.]+)/');
    }

    public function compile()
    {
        $src = basename($this->sourceFileName);
        $this->executableFileName = $execFileName = "$src.vvp";
        $compileargs = $this->getParam('compileargs');
        $cmd = "iverilog " . implode(' ', $compileargs) . " -o $execFileName $src";
        list($output, $this->cmpinfo) = $this->runInSandbox($cmd);
    }

    public function defaultFileName($sourcecode)
    {
        return 'prog.v';
    }

    public function getExecutablePath()
    {
        return '/usr/bin/vvp';
    }

    public function getTargetFile()
    {
        return $this->executableFileName;
    }
}
