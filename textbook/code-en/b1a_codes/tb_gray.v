// Testbench: neighbouring numbers (including 15 -> 0) differ by one bit; the reverse conversion returns the number.
`timescale 1ns/1ps
module tb_gray;
    reg  [3:0] b;
    wire [3:0] g;
    wire [3:0] back;
    reg  [3:0] prev;
    integer i, errors;

    bin2gray enc (.b(b), .g(g));
    gray2bin dec (.g(g), .b(back));

    function integer ones(input [3:0] v);
        ones = v[0] + v[1] + v[2] + v[3];
    endfunction

    initial begin
        errors = 0;
        b = 4'd15;
        #5;
        prev = g;
        for (i = 0; i < 16; i = i + 1) begin
            b = i[3:0];
            #5;
            if (ones(g ^ prev) !== 1) begin errors = errors + 1; $display("ERROR: %0d changes %0d bits", i, ones(g ^ prev)); end
            if (back !== b) begin errors = errors + 1; $display("ERROR: back-conversion of %0d", i); end
            prev = g;
        end
        b = 4'd5;
        #5;
        if (g !== 4'b0111) begin errors = errors + 1; $display("ERROR: 5 -> %b", g); end
        if (errors == 0) $display("OK: gray, neighbours differ by one bit");
        else $display("FAIL: %0d errors", errors);
        $finish;
    end
endmodule
