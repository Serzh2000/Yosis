// Testbench: the numbers 0xA5 and 0x3C, switch s and the address s[1:0]; the output must repeat the chosen number entirely.
`timescale 1ns/1ps
module tb_mux_bus8;
    reg  [7:0] a, b, c, d;
    reg        s;
    reg  [1:0] s4;
    wire [7:0] y2, y4;
    integer errors;

    mux2_bus8 m2 (.a(a), .b(b), .s(s), .y(y2));
    mux4_bus8 m4 (.d0(a), .d1(b), .d2(c), .d3(d), .s(s4), .y(y4));

    initial begin
        errors = 0;
        a = 8'hA5; b = 8'h3C; c = 8'hFF; d = 8'h00;
        s = 1'b0; s4 = 2'd0; #5;
        if (y2 !== 8'hA5 || y4 !== 8'hA5) begin errors = errors + 1; $display("ERROR: s=0"); end
        s = 1'b1; s4 = 2'd1; #5;
        if (y2 !== 8'h3C || y4 !== 8'h3C) begin errors = errors + 1; $display("ERROR: s=1"); end
        s4 = 2'd2; #5;
        if (y4 !== 8'hFF) begin errors = errors + 1; $display("ERROR: s4=2"); end
        s4 = 2'd3; #5;
        if (y4 !== 8'h00) begin errors = errors + 1; $display("ERROR: s4=3"); end
        if (errors == 0) $display("OK: mux_bus8");
        else $display("FAIL: %0d errors", errors);
        $finish;
    end
endmodule
