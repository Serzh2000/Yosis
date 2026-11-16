// Тестбенч: для цифр 0..9 ошибки нет; один перевёрнутый бит виден всегда; два перевёрнутых не видны.
`timescale 1ns/1ps
module tb_parity;
    reg  [3:0] d;
    wire [4:0] word;
    reg  [4:0] rx;
    wire       err;
    integer i, k, m, errors;

    parity_tx tx (.d(d), .word(word));
    parity_rx rcv (.word(rx), .err(err));

    initial begin
        errors = 0;
        for (i = 0; i < 10; i = i + 1) begin
            d = i[3:0];
            #5;
            rx = word;
            #5;
            if (err !== 1'b0) begin errors = errors + 1; $display("ERROR: digit %0d, clean word", i); end
            for (k = 0; k < 5; k = k + 1) begin
                rx = word ^ (5'd1 << k);                 // перевернуть один бит
                #5;
                if (err !== 1'b1) begin errors = errors + 1; $display("ERROR: digit %0d, bit %0d not detected", i, k); end
                for (m = k + 1; m < 5; m = m + 1) begin
                    rx = word ^ (5'd1 << k) ^ (5'd1 << m);   // два бита: чётность молчит
                    #5;
                    if (err !== 1'b0) begin errors = errors + 1; $display("ERROR: double error is seen?"); end
                end
            end
        end
        if (errors == 0) $display("OK: parity, single faults found, double faults missed");
        else $display("FAIL: %0d errors", errors);
        $finish;
    end
endmodule
