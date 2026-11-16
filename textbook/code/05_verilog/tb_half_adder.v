// Тестбенч полусумматора: подаёт все 4 комбинации и сверяет выходы с ожидаемыми.
`timescale 1ns/1ps
module tb_half_adder;
    reg  a, b;                       // входы проверяемого модуля: reg, их задаёт тестбенч
    wire s, c;                       // выходы: wire, их ведёт модуль
    integer i, bad = 0;

    half_adder dut (.a(a), .b(b), .s(s), .c(c));   // экземпляр проверяемого модуля

    initial begin
        for (i = 0; i < 4; i = i + 1) begin
            {a, b} = i[1:0];         // перебор: 00, 01, 10, 11
            #10;                     // ждём 10 нс, пока схема отработает
            if (s !== (a ^ b) || c !== (a & b)) begin
                bad = bad + 1;
                $display("ошибка: a=%b b=%b s=%b c=%b", a, b, s, c);
            end
        end
        if (bad == 0) $display("half_adder: OK");
        else          $display("half_adder: ОШИБОК %0d", bad);
        $finish;
    end
endmodule
