// Тестбенч: три мультиплексора сравниваются друг с другом и с ожидаемым значением на всех 8 комбинациях.
`timescale 1ns/1ps
module tb_mux2;
    reg a, b, s;
    wire y1, y2, y3;
    integer i, errors;

    mux2_q     m1 (.a(a), .b(b), .s(s), .y(y1));
    mux2_case  m2 (.a(a), .b(b), .s(s), .y(y2));
    mux2_gates m3 (.a(a), .b(b), .s(s), .y(y3));

    initial begin
        errors = 0;
        for (i = 0; i < 8; i = i + 1) begin
            {s, a, b} = i[2:0];
            #5;
            if (y1 !== (s ? b : a) || y2 !== y1 || y3 !== y1) begin
                errors = errors + 1;
                $display("ERROR: s=%b a=%b b=%b y=%b%b%b", s, a, b, y1, y2, y3);
            end
        end
        if (errors == 0) $display("OK: mux2, three versions agree");
        else $display("FAIL: %0d errors", errors);
        $finish;
    end
endmodule
