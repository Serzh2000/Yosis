// Testbench for the shift registers and for the "= instead of <=" mistake.
`timescale 1ns/1ps
module tb_shift;
    reg clk = 0, rst = 1, din = 0, load = 0, d1 = 0;
    reg [3:0] pd = 4'b1011;
    wire [3:0] q;
    wire dout, b0, b1, b2, o0, o1, o2;
    integer errors = 0, i;
    reg [3:0] got;
    shift_sipo #(.W(4)) sipo (.clk(clk), .rst(rst), .din(din), .q(q));
    shift_piso          piso (.clk(clk), .load(load), .d(pd), .dout(dout));
    shift_bad           bad  (.clk(clk), .d(d1), .q0(b0), .q1(b1), .q2(b2));
    shift_ok            ok   (.clk(clk), .d(d1), .q0(o0), .q1(o1), .q2(o2));
    always #5 clk = ~clk;

    initial begin
        @(posedge clk); #1 rst = 0;
        // 1) serial input 1,0,1,1 (most significant first) -> word 1011
        din = 1; @(posedge clk); #1;
        din = 0; @(posedge clk); #1;
        din = 1; @(posedge clk); #1;
        din = 1; @(posedge clk); #1;
        if (q !== 4'b1011) begin errors = errors + 1; $display("ERROR: SIPO assembled %b, expected 1011", q); end
        // 2) parallel load of 1011 and output MSB first
        load = 1; @(posedge clk); #1; load = 0;
        got = 4'b0000;
        for (i = 0; i < 4; i = i + 1) begin got = {got[2:0], dout}; @(posedge clk); #1; end
        if (got !== 4'b1011) begin errors = errors + 1; $display("ERROR: PISO sent %b, expected 1011", got); end
        // 3) blocking versus non-blocking: apply a one for one cycle
        d1 = 1; @(posedge clk); #1; d1 = 0;
        if ({b2, b1, b0} !== 3'b111) begin errors = errors + 1; $display("ERROR: expected the one to fly through shift_bad at once"); end
        if ({o2, o1, o0} !== 3'b001) begin errors = errors + 1; $display("ERROR: shift_ok must shift by one position"); end
        @(posedge clk); #1;
        if ({o2, o1, o0} !== 3'b010) begin errors = errors + 1; $display("ERROR: shift_ok, cycle 2"); end
        @(posedge clk); #1;
        if ({o2, o1, o0} !== 3'b100) begin errors = errors + 1; $display("ERROR: shift_ok, cycle 3"); end
        if (errors == 0) $display("OK"); else $display("FAIL: %0d", errors);
        $finish;
    end
endmodule
