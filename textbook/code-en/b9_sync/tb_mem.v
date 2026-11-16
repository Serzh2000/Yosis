// Memory testbench: the ROM gives the prepared words, the RAM remembers what was written, a read lags by a cycle.
`timescale 1ns/1ps
module tb_mem;
    reg clk = 0, we = 0;
    reg [3:0] ra = 0, wa = 0;
    reg [7:0] din = 0;
    wire [7:0] rd, dout;
    integer errors = 0, i;
    rom16x8 rom (.addr(ra), .data(rd));
    ram16x8 ram (.clk(clk), .we(we), .addr(wa), .din(din), .dout(dout));
    always #5 clk = ~clk;

    initial begin
        // ROM
        ra = 4'd0; #1; if (rd !== 8'h3F) begin errors = errors + 1; $display("ERROR: ROM[0] = %h", rd); end
        ra = 4'd9; #1; if (rd !== 8'h6F) begin errors = errors + 1; $display("ERROR: ROM[9] = %h", rd); end
        ra = 4'd15; #1; if (rd !== 8'h71) begin errors = errors + 1; $display("ERROR: ROM[15] = %h", rd); end
        // RAM: write 4 words
        we = 1;
        for (i = 0; i < 4; i = i + 1) begin wa = i; din = 8'hA0 + i; @(posedge clk); #1; end
        we = 0;
        // read: the word appears after the edge at which the address is already applied
        for (i = 0; i < 4; i = i + 1) begin
            wa = i; @(posedge clk); #1;
            if (dout !== 8'hA0 + i) begin errors = errors + 1; $display("ERROR: RAM[%0d] = %h", i, dout); end
        end
        // a read during a write returns the old word
        wa = 4'd2; din = 8'h55; we = 1; @(posedge clk); #1;
        if (dout !== 8'hA2) begin errors = errors + 1; $display("ERROR: during a write the old word must be read, not %h", dout); end
        we = 0; @(posedge clk); #1;
        if (dout !== 8'h55) begin errors = errors + 1; $display("ERROR: the new word %h", dout); end
        if (errors == 0) $display("OK"); else $display("FAIL: %0d", errors);
        $finish;
    end
endmodule
