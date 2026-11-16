// Tests the buffer (0, 1, Z) and the multiplexer bus.
`timescale 1ns/1ps
module tb_tristate;
    reg        oe = 0, d = 0;
    wire       pin;
    reg        sel = 0;
    reg  [3:0] a = 4'hA, b = 4'h5;
    wire [3:0] bus;
    integer bad = 0;

    tri_buf u1 (.oe(oe), .d(d), .pin(pin));
    bus_mux u2 (.sel(sel), .a(a), .b(b), .bus(bus));

    initial begin
        #1; if (pin !== 1'bz) bad = bad + 1;          // oe = 0: the line is released
        oe = 1; d = 0; #1; if (pin !== 1'b0) bad = bad + 1;
        d = 1;         #1; if (pin !== 1'b1) bad = bad + 1;
        oe = 0;        #1; if (pin !== 1'bz) bad = bad + 1;
        #1; if (bus !== 4'hA) bad = bad + 1;
        sel = 1; #1; if (bus !== 4'h5) bad = bad + 1;
        if (bad == 0) $display("tristate: OK"); else $display("tristate: ERRORS %0d", bad);
        $finish;
    end
endmodule
