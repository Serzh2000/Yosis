// Hamming code check: all data words and all single errors.
`timescale 1ns/1ps
module tb_hamming74;
    reg  [3:0] d;
    reg  [6:0] err;
    wire [6:0] sent, got;
    wire [2:0] syn;
    wire [3:0] q;
    integer i, k, bad;

    hamming74 dut (.d(d), .err(err), .sent(sent), .got(got), .syn(syn), .q(q));

    initial begin
        bad = 0;
        for (i = 0; i < 16; i = i + 1) begin
            d = i; err = 7'b0; #1;
            if (q !== d || syn !== 3'd0) bad = bad + 1;
            for (k = 0; k < 7; k = k + 1) begin
                err = 7'd1 << k; #1;
                if (q !== d || syn !== k + 1) bad = bad + 1;
            end
        end
        if (bad == 0) $display("hamming74: OK, 16 words x 8 cases"); else $display("hamming74: ERRORS %0d", bad);
        $finish;
    end
endmodule
