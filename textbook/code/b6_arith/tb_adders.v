// Тестбенч: полусумматор (4 строки) и полный сумматор (8 строк) сверяются с обычным сложением a + b + cin.
`timescale 1ns/1ps
module tb_adders;
    reg a, b, cin;
    wire hs, hc, fs, fc;
    integer i, errors;

    half_adder ha (.a(a), .b(b), .s(hs), .c(hc));
    full_adder fa (.a(a), .b(b), .cin(cin), .s(fs), .cout(fc));

    initial begin
        errors = 0;
        for (i = 0; i < 8; i = i + 1) begin
            {a, b, cin} = i[2:0];
            #5;
            if ({hc, hs} !== a + b) begin errors = errors + 1; $display("ERROR: half adder %b%b", a, b); end
            if ({fc, fs} !== a + b + cin) begin errors = errors + 1; $display("ERROR: full adder %b%b%b", a, b, cin); end
        end
        a = 1; b = 1; cin = 1;
        #5;
        if (fs !== 1'b1 || fc !== 1'b1) begin errors = errors + 1; $display("ERROR: 1+1+1"); end
        if (errors == 0) $display("OK: adders");
        else $display("FAIL: %0d errors", errors);
        $finish;
    end
endmodule
