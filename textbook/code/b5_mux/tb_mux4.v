// Тестбенч: все 16 значений x и все 4 адреса; три мультиплексора должны выдать x[s].
`timescale 1ns/1ps
module tb_mux4;
    reg  [3:0] x;
    reg  [1:0] s;
    wire y1, y2, y3;
    integer i, j, errors;

    mux4_case  m1 (.x(x), .s(s), .y(y1));
    mux4_index m2 (.x(x), .s(s), .y(y2));
    mux4_tree  m3 (.x(x), .s(s), .y(y3));

    initial begin
        errors = 0;
        for (i = 0; i < 16; i = i + 1)
            for (j = 0; j < 4; j = j + 1) begin
                x = i[3:0];
                s = j[1:0];
                #5;
                if (y1 !== x[s] || y2 !== x[s] || y3 !== x[s]) begin
                    errors = errors + 1;
                    $display("ERROR: x=%b s=%0d y=%b%b%b", x, s, y1, y2, y3);
                end
            end
        if (errors == 0) $display("OK: mux4, 64 combinations");
        else $display("FAIL: %0d errors", errors);
        $finish;
    end
endmodule
