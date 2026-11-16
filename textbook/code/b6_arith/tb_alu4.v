// Тестбенч: примеры из таблицы флагов главы и полная проверка сложения/вычитания знаковых чисел.
`timescale 1ns/1ps
module tb_alu4;
    reg  [3:0] a, b;
    reg  [2:0] op;
    wire [3:0] y;
    wire z, n, c, v;
    integer i, j, errors, sa, sb, sr;

    alu4 dut (.a(a), .b(b), .op(op), .y(y), .z(z), .n(n), .c(c), .v(v));

    task check(input [3:0] ea, input [3:0] eb, input [2:0] eop, input [3:0] ey, input ez, input en, input ec, input ev);
        begin
            a = ea; b = eb; op = eop; #2;
            if (y !== ey || z !== ez || n !== en || c !== ec || v !== ev) begin
                errors = errors + 1;
                $display("ERROR: %b op=%b: y=%b Z=%b N=%b C=%b V=%b", ea, eop, y, z, n, c, v);
            end
        end
    endtask

    initial begin
        errors = 0;
        // 5+3, 7+(-3), (-8)+(-1), 3+(-3): строки таблицы флагов
        check(4'd5,  4'd3,  3'b000, 4'b1000, 0, 1, 0, 1);
        check(4'd7,  4'b1101, 3'b000, 4'b0100, 0, 0, 1, 0);
        check(4'b1000, 4'b1111, 3'b000, 4'b0111, 0, 0, 1, 1);
        check(4'd3,  4'b1101, 3'b000, 4'b0000, 1, 0, 1, 0);
        check(4'd7,  4'd3,  3'b001, 4'b0100, 0, 0, 1, 0);     // 7-3 = 4
        check(4'd3,  4'd5,  3'b001, 4'b1110, 0, 1, 0, 0);     // 3-5 = -2: C = 0 --- «заём»
        check(4'hC,  4'hA,  3'b010, 4'h8, 0, 1, 0, 0);
        check(4'hC,  4'hA,  3'b011, 4'hE, 0, 1, 0, 0);
        check(4'hC,  4'hA,  3'b100, 4'h6, 0, 0, 0, 0);
        for (i = 0; i < 16; i = i + 1)
            for (j = 0; j < 16; j = j + 1) begin
                sa = (i > 7) ? i - 16 : i;
                sb = (j > 7) ? j - 16 : j;
                a = i[3:0]; b = j[3:0];
                op = 3'b000; #2;
                sr = sa + sb;
                if (v !== (sr > 7 || sr < -8)) begin errors = errors + 1; $display("ERROR: V for %0d+%0d", sa, sb); end
                op = 3'b001; #2;
                sr = sa - sb;
                if (v !== (sr > 7 || sr < -8)) begin errors = errors + 1; $display("ERROR: V for %0d-%0d", sa, sb); end
                if ((sa < sb) !== (n ^ v)) begin errors = errors + 1; $display("ERROR: N^V for %0d,%0d", sa, sb); end
                if ((i < j) !== ~c) begin errors = errors + 1; $display("ERROR: C for %0d,%0d", i, j); end
            end
        if (errors == 0) $display("OK: alu4");
        else $display("FAIL: %0d errors", errors);
        $finish;
    end
endmodule
