`timescale 1ns/1ps
module tb_fifo8;
    reg clk = 0, rst = 1, wr = 0, rd = 0;
    reg [7:0] din = 0;
    wire [7:0] dout;
    wire empty, full;
    integer i, bad = 0;
    fifo8 dut (.clk(clk), .rst(rst), .wr(wr), .rd(rd), .din(din), .dout(dout), .empty(empty), .full(full));
    always #5 clk = ~clk;

    initial begin
        repeat (2) @(posedge clk); #1 rst = 0;
        if (!empty || full) bad = bad + 1;
        for (i = 0; i < 10; i = i + 1) begin           // write 10 words; the last two will not fit
            wr = 1; din = 8'h10 + i; @(posedge clk); #1;
        end
        wr = 0;
        if (!full) bad = bad + 1;
        for (i = 0; i < 8; i = i + 1) begin            // read 8 words in order
            rd = 1; @(posedge clk); #1;
            if (dout !== 8'h10 + i) bad = bad + 1;
        end
        rd = 0;
        if (!empty) bad = bad + 1;
        if (bad == 0) $display("fifo8: OK"); else $display("fifo8: ERRORS %0d", bad);
        $finish;
    end
endmodule
