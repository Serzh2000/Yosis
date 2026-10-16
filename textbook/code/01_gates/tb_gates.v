// Тестбенч для проекта 1: перебираем все комбинации кнопок
// и печатаем таблицу истинности.
`timescale 1ns/1ps
module tb_gates;
    reg  [1:0] btn;          // сигналы, которые "нажимает" тестбенч
    wire [5:0] led;          // выходы проверяемого модуля

    // Экземпляр проверяемого модуля (DUT -- Device Under Test)
    gates dut (.btn(btn), .led(led));

    integer i;
    initial begin
        $dumpfile("tb_gates.vcd");
        $dumpvars(0, tb_gates);
        $display(" a b | AND OR NOT NAND NOR XOR");
        for (i = 0; i < 4; i = i + 1) begin
            btn = i[1:0];
            #10;             // ждём 10 нс, пока сигналы установятся
            // ~led -- потому что светодиоды инверсные
            $display(" %b %b |  %b   %b   %b    %b    %b   %b",
                     btn[0], btn[1], ~led[0], ~led[1], ~led[2],
                     ~led[3], ~led[4], ~led[5]);
        end
        $finish;
    end
endmodule
