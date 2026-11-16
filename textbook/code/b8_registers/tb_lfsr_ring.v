// Тестбенч кольцевого регистра и LFSR: периоды 4, 7 и 15, все состояния различны.
`timescale 1ns/1ps
module tb_lfsr_ring;
    reg clk = 0, rst = 1;
    wire [3:0] rq, lq4;
    wire [2:0] lq3;
    integer errors = 0, i, j;
    reg [3:0] seen4 [0:15];
    reg [2:0] seen3 [0:7];
    ring4 r  (.clk(clk), .rst(rst), .q(rq));
    lfsr3 l3 (.clk(clk), .rst(rst), .q(lq3));
    lfsr4 l4 (.clk(clk), .rst(rst), .q(lq4));
    always #5 clk = ~clk;

    initial begin
        @(posedge clk); #1 rst = 0;
        // кольцо: 0001 -> 0010 -> 0100 -> 1000 -> 0001
        if (rq !== 4'b0001) begin errors = errors + 1; $display("ОШИБКА: кольцо после сброса %b", rq); end
        repeat (4) begin @(posedge clk); #1; end
        if (rq !== 4'b0001) begin errors = errors + 1; $display("ОШИБКА: кольцо не вернулось за 4 такта: %b", rq); end
        // LFSR3: 7 различных состояний, возвращение на 8-м шаге
        for (i = 0; i < 7; i = i + 1) begin
            seen3[i] = lq3;
            if (lq3 === 3'b000) begin errors = errors + 1; $display("ОШИБКА: lfsr3 попал в 000"); end
            for (j = 0; j < i; j = j + 1) if (seen3[j] === lq3) begin errors = errors + 1; $display("ОШИБКА: lfsr3 повторил %b", lq3); end
            @(posedge clk); #1;
        end
        if (lq3 !== seen3[0]) begin errors = errors + 1; $display("ОШИБКА: период lfsr3 не 7"); end
        // LFSR4: 15 различных состояний
        for (i = 0; i < 15; i = i + 1) begin
            seen4[i] = lq4;
            if (lq4 === 4'b0000) begin errors = errors + 1; $display("ОШИБКА: lfsr4 попал в 0000"); end
            for (j = 0; j < i; j = j + 1) if (seen4[j] === lq4) begin errors = errors + 1; $display("ОШИБКА: lfsr4 повторил %b", lq4); end
            @(posedge clk); #1;
        end
        if (lq4 !== seen4[0]) begin errors = errors + 1; $display("ОШИБКА: период lfsr4 не 15"); end
        if (errors == 0) $display("OK"); else $display("FAIL: %0d", errors);
        $finish;
    end
endmodule
