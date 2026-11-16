// Тестбенч делителя: вместо 13 500 000 берём N = 4. Импульс tick раз в 4 такта, период out = 8 тактов.
`timescale 1ns/1ps
module tb_clk_div;
    reg clk = 0;
    wire out, tick;
    integer errors = 0, i, last = -1, period = 0, n_ticks = 0, edges = 0;
    reg prev_out = 0;
    clk_div #(.N(4)) dut (.clk(clk), .out(out), .tick(tick));
    always #5 clk = ~clk;

    always @(posedge clk) begin
        i = i + 1;
        if (tick) begin
            n_ticks = n_ticks + 1;
            if (last >= 0 && i - last !== 4) begin errors = errors + 1; $display("ОШИБКА: между tick %0d тактов", i - last); end
            last = i;
        end
        if (out && !prev_out) edges = edges + 1;
        prev_out = out;
    end

    initial begin
        i = 0;
        repeat (40) @(posedge clk);
        #1;
        if (n_ticks < 9 || n_ticks > 10) begin errors = errors + 1; $display("ОШИБКА: tick %0d раз за 40 тактов", n_ticks); end
        if (edges < 4 || edges > 6) begin errors = errors + 1; $display("ОШИБКА: фронтов out: %0d, ждали 5", edges); end
        if (errors == 0) $display("OK"); else $display("FAIL: %0d", errors);
        $finish;
    end
endmodule
