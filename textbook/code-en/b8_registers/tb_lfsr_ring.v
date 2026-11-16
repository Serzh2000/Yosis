// Ring register and LFSR testbench: periods 4, 7 and 15, all states distinct.
`timescale 1ns/1ps
module tb_lfsr_ring;
    reg clk = 0, rst = 1;
    wire [3:0] rq, lq4;
    wire [2:0] lq3;
    integer errors = 0, i, j;
    reg [3:0] seen4 [0:15];
    reg [2:0] seen3 [0:7];
    ring4 r  (.clk(clk), .rst(rst), .q(rq));
    lfsr3 l3 (.clk(clk), .rst(rst), .q(lq3));
    lfsr4 l4 (.clk(clk), .rst(rst), .q(lq4));
    always #5 clk = ~clk;

    initial begin
        @(posedge clk); #1 rst = 0;
        // ring: 0001 -> 0010 -> 0100 -> 1000 -> 0001
        if (rq !== 4'b0001) begin errors = errors + 1; $display("ERROR: ring after reset %b", rq); end
        repeat (4) begin @(posedge clk); #1; end
        if (rq !== 4'b0001) begin errors = errors + 1; $display("ERROR: ring did not return in 4 cycles: %b", rq); end
        // LFSR3: 7 distinct states, back at the 8th step
        for (i = 0; i < 7; i = i + 1) begin
            seen3[i] = lq3;
            if (lq3 === 3'b000) begin errors = errors + 1; $display("ERROR: lfsr3 reached 000"); end
            for (j = 0; j < i; j = j + 1) if (seen3[j] === lq3) begin errors = errors + 1; $display("ERROR: lfsr3 repeated %b", lq3); end
            @(posedge clk); #1;
        end
        if (lq3 !== seen3[0]) begin errors = errors + 1; $display("ERROR: lfsr3 period is not 7"); end
        // LFSR4: 15 distinct states
        for (i = 0; i < 15; i = i + 1) begin
            seen4[i] = lq4;
            if (lq4 === 4'b0000) begin errors = errors + 1; $display("ERROR: lfsr4 reached 0000"); end
            for (j = 0; j < i; j = j + 1) if (seen4[j] === lq4) begin errors = errors + 1; $display("ERROR: lfsr4 repeated %b", lq4); end
            @(posedge clk); #1;
        end
        if (lq4 !== seen4[0]) begin errors = errors + 1; $display("ERROR: lfsr4 period is not 15"); end
        if (errors == 0) $display("OK"); else $display("FAIL: %0d", errors);
        $finish;
    end
endmodule
