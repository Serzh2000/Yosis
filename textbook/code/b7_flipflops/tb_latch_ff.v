// Защёлка и триггер рядом: при c = clk = 1 защёлка повторяет d, триггер не реагирует.
`timescale 1ns/1ps
module tb_latch_ff;
    reg clk = 0, d = 0;
    wire ql, qf;
    integer errors = 0;
    d_latch l (.c(clk), .d(d), .q(ql));
    d_ff    f (.clk(clk), .d(d), .q(qf));

    task chk(input el, input ef, input [8*28-1:0] what);
        begin
            #1;
            if (ql !== el || qf !== ef) begin
                errors = errors + 1;
                $display("ОШИБКА: %0s: защёлка=%b (ждали %b), триггер=%b (ждали %b)", what, ql, el, qf, ef);
            end
        end
    endtask

    initial begin
        d = 0; clk = 0; #5;
        clk = 1; chk(1'b0, 1'b0, "фронт, d=0");
        d = 1;           chk(1'b1, 1'b0, "d=1 при clk=1");   // защёлка пропустила, триггер нет
        d = 0;           chk(1'b0, 1'b0, "d=0 при clk=1");
        d = 1;           chk(1'b1, 1'b0, "d=1 снова");
        clk = 0; #5;     chk(1'b1, 1'b0, "clk=0: хранит");   // защёлка заморозила 1
        d = 0;           chk(1'b1, 1'b0, "d меняется при clk=0");
        d = 1; #5; clk = 1; chk(1'b1, 1'b1, "фронт, d=1");   // триггер взял d в момент фронта
        if (errors == 0) $display("OK"); else $display("FAIL: %0d", errors);
        $finish;
    end
endmodule
