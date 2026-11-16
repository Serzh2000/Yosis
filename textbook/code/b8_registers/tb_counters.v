// Тестбенч счётчиков: двоичный (переход 15 -> 0), по модулю 6, с загрузкой, реверсивный.
`timescale 1ns/1ps
module tb_counters;
    reg clk = 0, rst = 1, en = 0, load = 0, up = 1;
    reg [3:0] d = 0;
    wire [3:0] qb, qm, ql, qu;
    wire tc;
    integer errors = 0, i, ticks;
    cnt_bin #(.W(4))        b (.clk(clk), .rst(rst), .en(en), .q(qb));
    cnt_mod #(.N(6), .W(4)) m (.clk(clk), .rst(rst), .q(qm), .tc(tc));
    cnt_load                l (.clk(clk), .rst(rst), .load(load), .en(en), .d(d), .q(ql));
    cnt_updown              u (.clk(clk), .rst(rst), .en(en), .up(up), .q(qu));
    always #5 clk = ~clk;

    initial begin
        @(posedge clk); #1 rst = 0; en = 1;
        // двоичный: после 15 снова 0
        for (i = 1; i <= 16; i = i + 1) begin
            @(posedge clk); #1;
            if (qb !== (i % 16)) begin errors = errors + 1; $display("ОШИБКА: cnt_bin на шаге %0d: %0d", i, qb); end
        end
        // по модулю 6: значения 0..5, никогда не 6; импульс tc раз в 6 тактов
        rst = 1; @(posedge clk); #1 rst = 0;
        ticks = 0;
        for (i = 0; i < 24; i = i + 1) begin
            if (qm > 4'd5) begin errors = errors + 1; $display("ОШИБКА: cnt_mod вышел за модуль: %0d", qm); end
            if (tc) ticks = ticks + 1;
            @(posedge clk); #1;
        end
        if (ticks !== 4) begin errors = errors + 1; $display("ОШИБКА: tc %0d раз за 24 такта, ждали 4", ticks); end
        // загрузка: load побеждает счёт
        rst = 1; @(posedge clk); #1 rst = 0;
        load = 1; d = 4'd9; @(posedge clk); #1; load = 0;
        if (ql !== 4'd9) begin errors = errors + 1; $display("ОШИБКА: загрузка 9, а q=%0d", ql); end
        @(posedge clk); #1;
        if (ql !== 4'd10) begin errors = errors + 1; $display("ОШИБКА: счёт после загрузки: %0d", ql); end
        // реверсивный: сейчас up=1; поднимем до 3 и спустим до 0, потом ниже нуля
        rst = 1; @(posedge clk); #1 rst = 0; up = 1;
        repeat (3) begin @(posedge clk); #1; end
        if (qu !== 4'd3) begin errors = errors + 1; $display("ОШИБКА: вверх до 3: %0d", qu); end
        up = 0; repeat (3) begin @(posedge clk); #1; end
        if (qu !== 4'd0) begin errors = errors + 1; $display("ОШИБКА: вниз до 0: %0d", qu); end
        @(posedge clk); #1;
        if (qu !== 4'd15) begin errors = errors + 1; $display("ОШИБКА: 0 - 1 должно дать 15: %0d", qu); end
        if (errors == 0) $display("OK"); else $display("FAIL: %0d", errors);
        $finish;
    end
endmodule
