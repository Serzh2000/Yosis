// Exhaustive test of three modules: ones count, generate-based adder and parity.
`timescale 1ns/1ps
module tb_loops;
    reg  [7:0] d;
    wire [3:0] n;
    wire       p;
    reg  [3:0] a, b;
    reg        cin;
    wire [3:0] s;
    wire       cout;
    integer i, k, bad = 0;

    popcount8 u1 (.d(d), .n(n));
    parity_fn u2 (.d(d), .p(p));
    adder_gen #(.N(4)) u3 (.a(a), .b(b), .cin(cin), .s(s), .cout(cout));

    initial begin
        for (i = 0; i < 256; i = i + 1) begin
            d = i[7:0]; #1;
            k = d[0] + d[1] + d[2] + d[3] + d[4] + d[5] + d[6] + d[7];
            if (n !== k[3:0]) bad = bad + 1;
            if (p !== (k % 2)) bad = bad + 1;
        end
        for (i = 0; i < 512; i = i + 1) begin
            {cin, a, b} = i[8:0]; #1;
            if ({cout, s} !== a + b + cin) bad = bad + 1;
        end
        if (bad == 0) $display("loops: OK"); else $display("loops: ERRORS %0d", bad);
        $finish;
    end
endmodule
