// A button held for 10 cycles gives exactly one pulse; sync2 lags by two cycles.
`timescale 1ns/1ps
module tb_button_pulse;
    reg clk = 0, btn = 0;
    wire pulse, so;
    integer errors = 0, count = 0, i;
    button_pulse dut (.clk(clk), .btn(btn), .pulse(pulse));
    sync2        s   (.clk(clk), .async_in(btn), .sync_out(so));
    always #5 clk = ~clk;
    always @(posedge clk) if (pulse) count <= count + 1;

    initial begin
        repeat (3) @(posedge clk);
        #2 btn = 1;                       // the button is pressed away from the edge
        @(posedge clk); #1;
        if (so !== 1'b0) begin errors = errors + 1; $display("ERROR: sync2 answered in one cycle"); end
        @(posedge clk); #1;
        if (so !== 1'b1) begin errors = errors + 1; $display("ERROR: sync2 did not answer in two cycles"); end
        for (i = 0; i < 8; i = i + 1) @(posedge clk);
        #2 btn = 0;
        repeat (6) @(posedge clk);
        if (count !== 1) begin errors = errors + 1; $display("ERROR: %0d pulses, expected 1", count); end
        if (errors == 0) $display("OK"); else $display("FAIL: %0d", errors);
        $finish;
    end
endmodule
