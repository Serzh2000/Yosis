`timescale 1ns/1ps
// Testbench: all 16 inputs; both priority encoders are compared with a reference.
module tb_prio4;
    reg  [3:0] x;
    wire [1:0] y1, y2;
    wire       v1, v2;
    reg  [1:0] ey;
    reg        ev;
    integer i, bad = 0;
    prio4_if    u_if (.x(x), .y(y1), .v(v1));
    prio4_casez u_cz (.x(x), .y(y2), .v(v2));
    initial begin
        for (i = 0; i < 16; i = i + 1) begin
            x = i; #1;
            ev = (x != 0);
            ey = x[3] ? 2'd3 : x[2] ? 2'd2 : x[1] ? 2'd1 : 2'd0;
            if (y1 !== ey || v1 !== ev) bad = bad + 1;
            if (y2 !== ey || v2 !== ev) bad = bad + 1;
        end
        x = 4'b0110; #1;                         // zones 1 and 2: show the higher one, number 2
        if (y1 !== 2'd2) bad = bad + 1;
        if (bad == 0) $display("prio4: OK"); else $display("prio4: ERRORS %0d", bad);
        $finish;
    end
endmodule
