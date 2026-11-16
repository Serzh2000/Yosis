// Testbench: 16 data values, with no error and with an error in each of the 7 positions; the byte 0x41.
`timescale 1ns/1ps
module tb_hamming;
    reg  [3:0] d;
    wire [6:0] word;
    reg  [6:0] rx;
    wire [2:0] syn;
    wire [3:0] q;
    integer i, k, errors;

    hamming_enc enc (.d(d), .word(word));
    hamming_dec dec (.word(rx), .syndrome(syn), .d(q));

    initial begin
        errors = 0;
        for (i = 0; i < 16; i = i + 1) begin
            d = i[3:0];
            #5;
            rx = word;
            #5;
            if (syn !== 3'd0 || q !== d) begin errors = errors + 1; $display("ERROR: %0d without error", i); end
            for (k = 0; k < 7; k = k + 1) begin
                rx = word ^ (7'd1 << k);
                #5;
                if (syn !== k + 1 || q !== d) begin
                    errors = errors + 1;
                    $display("ERROR: data %0d, error in position %0d, syndrome %0d, data %b", i, k + 1, syn, q);
                end
            end
        end
        // In the code bit 0 is position 1, so a word written "by positions 1..7" reads right to left.
        d = 4'b0010;                       // d1d2d3d4 = 0100: the high half of 0x41
        #5;
        if (word !== 7'b0011001) begin errors = errors + 1; $display("ERROR: 0100 -> %b", word); end   // positions 1..7: 1001100
        d = 4'b1000;                       // d1d2d3d4 = 0001: the low half of 0x41
        #5;
        if (word !== 7'b1001011) begin errors = errors + 1; $display("ERROR: 0001 -> %b", word); end   // positions 1..7: 1101001
        rx = 7'b1011011;                   // the word 1101001 with position 5 flipped (by positions: 1101101)
        #5;
        if (syn !== 3'd5 || q !== 4'b1000) begin errors = errors + 1; $display("ERROR: example from the chapter"); end
        if (errors == 0) $display("OK: hamming, 16 values x 8 cases");
        else $display("FAIL: %0d errors", errors);
        $finish;
    end
endmodule
