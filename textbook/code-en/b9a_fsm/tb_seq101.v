// 1-0-1 detector: the stream 1 0 1 0 1 1 0 1 gives three hits (with overlap), "wrong" streams give none.
`timescale 1ns/1ps
module tb_seq101;
    reg  clk = 0, rst = 1, x = 0;
    wire hit;
    integer hits = 0, bad = 0;

    seq101 dut (.clk(clk), .rst(rst), .x(x), .hit(hit));
    always #5 clk = ~clk;

    task send(input b);                          // apply a bit, look at hit BEFORE the edge (Mealy)
        begin
            x = b; #1;
            if (hit) hits = hits + 1;
            @(posedge clk); #1;
        end
    endtask

    initial begin
        repeat (2) @(posedge clk); #1 rst = 0;
        send(1); send(0); send(1); send(0); send(1); send(1); send(0); send(1);
        if (hits !== 3) bad = bad + 1;
        hits = 0;
        send(1); send(1); send(0); send(0); send(0); send(1); send(1); send(1);
        if (hits !== 0) bad = bad + 1;
        if (bad == 0) $display("seq101: OK"); else $display("seq101: ERRORS %0d, hits=%0d", bad, hits);
        $finish;
    end
endmodule
