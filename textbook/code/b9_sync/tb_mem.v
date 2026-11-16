// Тестбенч памяти: ПЗУ выдаёт заготовленные слова, ОЗУ запоминает записанное, чтение запаздывает на такт.
`timescale 1ns/1ps
module tb_mem;
    reg clk = 0, we = 0;
    reg [3:0] ra = 0, wa = 0;
    reg [7:0] din = 0;
    wire [7:0] rd, dout;
    integer errors = 0, i;
    rom16x8 rom (.addr(ra), .data(rd));
    ram16x8 ram (.clk(clk), .we(we), .addr(wa), .din(din), .dout(dout));
    always #5 clk = ~clk;

    initial begin
        // ПЗУ
        ra = 4'd0; #1; if (rd !== 8'h3F) begin errors = errors + 1; $display("ОШИБКА: ПЗУ[0] = %h", rd); end
        ra = 4'd9; #1; if (rd !== 8'h6F) begin errors = errors + 1; $display("ОШИБКА: ПЗУ[9] = %h", rd); end
        ra = 4'd15; #1; if (rd !== 8'h71) begin errors = errors + 1; $display("ОШИБКА: ПЗУ[15] = %h", rd); end
        // ОЗУ: записываем 4 слова
        we = 1;
        for (i = 0; i < 4; i = i + 1) begin wa = i; din = 8'hA0 + i; @(posedge clk); #1; end
        we = 0;
        // читаем: слово появляется после фронта, на который адрес уже подан
        for (i = 0; i < 4; i = i + 1) begin
            wa = i; @(posedge clk); #1;
            if (dout !== 8'hA0 + i) begin errors = errors + 1; $display("ОШИБКА: ОЗУ[%0d] = %h", i, dout); end
        end
        // запись не мешает чтению соседней ячейки; чтение при записи отдаёт старое слово
        wa = 4'd2; din = 8'h55; we = 1; @(posedge clk); #1;
        if (dout !== 8'hA2) begin errors = errors + 1; $display("ОШИБКА: при записи должно читаться старое слово, а не %h", dout); end
        we = 0; @(posedge clk); #1;
        if (dout !== 8'h55) begin errors = errors + 1; $display("ОШИБКА: новое слово %h", dout); end
        if (errors == 0) $display("OK"); else $display("FAIL: %0d", errors);
        $finish;
    end
endmodule
