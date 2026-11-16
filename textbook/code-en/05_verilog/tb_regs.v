// Test of the register with enable, the shift register and the divide-by-4 divider.
`timescale 1ns/1ps
module tb_regs;
    reg        clk = 0, rst = 1, en = 0, din = 0;
    reg  [7:0] d = 8'h00;
    wire [7:0] q;
    wire [3:0] sh;
    wire       tick;
    integer bad = 0, ticks = 0;

    reg_en #(.W(8)) r (.clk(clk), .rst(rst), .en(en), .d(d), .q(q));
    shift4          s (.clk(clk), .rst(rst), .din(din), .q(sh));
    clk_div #(.N(4)) v (.clk(clk), .rst(rst), .tick(tick));

    always #5 clk = ~clk;
    always @(posedge tick) ticks = ticks + 1;

    initial begin
        repeat (2) @(posedge clk);
        #1 rst = 0;
        // register: without en the value does not change, with en it is written
        d = 8'hA5; @(posedge clk); #1;
        if (q !== 8'h00) bad = bad + 1;
        en = 1; @(posedge clk); #1; en = 0;
        if (q !== 8'hA5) bad = bad + 1;
        d = 8'h3C; @(posedge clk); #1;
        if (q !== 8'hA5) bad = bad + 1;
        // shift: feed 1,0,1,1
        din = 1; @(posedge clk); #1;
        din = 0; @(posedge clk); #1;
        din = 1; @(posedge clk); #1;
        din = 1; @(posedge clk); #1;
        if (sh !== 4'b1011) bad = bad + 1;
        // divider: 10 pulses in 40 clocks after reset (7 clocks have already passed)
        repeat (33) @(posedge clk);
        #1;
        if (ticks !== 10) bad = bad + 1;
        if (bad == 0) $display("regs: OK"); else $display("regs: ERRORS %0d, ticks=%0d", bad, ticks);
        $finish;
    end
endmodule
