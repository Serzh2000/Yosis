`timescale 1ns/1ps
// Тестбенч: двойное преобразование возвращает число, соседние коды Грея (в том числе 7 -> 0) отличаются одним битом.
module tb_gray;
    reg  [2:0] b;
    wire [2:0] g, back;
    reg  [2:0] prev;
    reg  [2:0] d;
    integer i, bad = 0;
    bin2gray u1 (.b(b), .g(g));
    gray2bin u2 (.g(g), .b(back));
    initial begin
        b = 3'd7; #1; prev = g;               // начинаем с 7, чтобы проверить и переход 7 -> 0
        for (i = 0; i < 8; i = i + 1) begin
            b = i; #1;
            d = g ^ prev;
            if (back !== b) bad = bad + 1;
            if (d !== 3'b001 && d !== 3'b010 && d !== 3'b100) bad = bad + 1;
            prev = g;
        end
        b = 3'd3; #1; if (g !== 3'b010) bad = bad + 1;
        b = 3'd4; #1; if (g !== 3'b110) bad = bad + 1;
        if (bad == 0) $display("gray: OK"); else $display("gray: ОШИБОК %0d", bad);
        $finish;
    end
endmodule
