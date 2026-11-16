// Testbench: both versions on all addresses with x = 0 and x = 1.
`timescale 1ns/1ps
module tb_demux4;
    reg x;
    reg [1:0] s;
    wire [3:0] y1, y2;
    integer i, errors;

    demux4       d1 (.x(x), .s(s), .y(y1));
    demux4_shift d2 (.x(x), .s(s), .y(y2));

    initial begin
        errors = 0;
        for (i = 0; i < 8; i = i + 1) begin
            {x, s} = i[2:0];
            #5;
            if (y1 !== (x ? (4'b0001 << s) : 4'b0000) || y2 !== y1) begin
                errors = errors + 1;
                $display("ERROR: x=%b s=%0d y=%b %b", x, s, y1, y2);
            end
        end
        if (errors == 0) $display("OK: demux4");
        else $display("FAIL: %0d errors", errors);
        $finish;
    end
endmodule
