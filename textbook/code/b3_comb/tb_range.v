`timescale 1ns/1ps
// Тестбенч к главе «Минимизация»: на цифрах 0..9 все записи совпадают с эталоном,
// на кодах 10..15 версия со сравнениями даёт 0, минимальная форма даёт 1 (для диапазона) -- и это допустимо.
module tb_range;
    reg  [3:0] x;
    wire y_gt_dc, y_gt_min, y_cmp, y_min, y_case;
    integer i, bad = 0;
    gt4_dc         u1 (.x(x), .y(y_gt_dc));
    gt4_min        u2 (.x(x), .y(y_gt_min));
    range3to9_cmp  u3 (.x(x), .y(y_cmp));
    range3to9_min  u4 (.x(x), .y(y_min));
    range3to9_case u5 (.x(x), .y(y_case));
    initial begin
        for (i = 0; i < 10; i = i + 1) begin
            x = i; #1;
            if (y_gt_dc  !== (i > 4)) bad = bad + 1;
            if (y_gt_min !== (i > 4)) bad = bad + 1;
            if (y_cmp  !== (i >= 3)) bad = bad + 1;
            if (y_min  !== (i >= 3)) bad = bad + 1;
            if (y_case !== (i >= 3)) bad = bad + 1;
        end
        for (i = 10; i < 16; i = i + 1) begin      // запрещённые коды: проверяем только то, что обещали
            x = i; #1;
            if (y_cmp !== 1'b0) bad = bad + 1;      // сравнения честно дают 0
            if (y_min !== 1'b1) bad = bad + 1;      // минимальная форма дала 1 -- нам всё равно
            if (y_case !== 1'bx) bad = bad + 1;     // в симуляторе x виден как x
        end
        if (bad == 0) $display("range: OK"); else $display("range: ОШИБОК %0d", bad);
        $finish;
    end
endmodule
