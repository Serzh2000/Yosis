/** Одна строка таблицы выводов примера: сигнал, номер вывода FPGA и пояснение. */
export type Pin = [signal: string, pin: number, explanation: string];

/** Файл board.cst примера Tang Nano 20K по таблице выводов. */
export function constraints(pins: Pin[]): string {
  return (
    `// Физические соединения Tang Nano 20K (GW2AR-LV18QN88C8/I7).
// IO_LOC связывает порт Verilog с номером вывода FPGA, а не контактом разъёма.
// IO_PORT задаёт электрический стандарт: LVCMOS33 — логические уровни 3,3 В.
// Для каждого отдельного бита шины требуется своё назначение.
// Проверенный pinout: https://github.com/YosysHQ/apicula/blob/master/examples/tangnano20k.cst
// Полярность LED и частота: https://wiki.sipeed.com/hardware/en/tang/tang-nano-20k/nano-20k.html
// Кнопки 87/88 и LED 15–20 уже находятся на плате.
// Кнопка даёт 1 при нажатии и 0 в покое; LED светится при 0 на выводе.

` +
    pins
      .map(
        ([signal, pin, explanation]) => `// ${signal}: ${explanation}
IO_LOC "${signal}" ${pin};
IO_PORT "${signal}" IO_TYPE=LVCMOS33${pin === 87 || pin === 88 ? ' PULL_MODE=DOWN' : ''};
${
  signal === 'clk'
    ? `// Такт подключаем к глобальному буферу с малой разницей задержек.
CLOCK_LOC "clk" BUFG;
`
    : ''
}`,
      )
      .join('\n')
  );
}
