`timescale 1ns/1ps
module tb_vending;
    reg clk = 0, rst = 1, c5 = 0, c10 = 0;
    wire vend;
    integer bad = 0, sales = 0;
    vending dut (.clk(clk), .rst(rst), .c5(c5), .c10(c10), .vend(vend));
    always #5 clk = ~clk;

    task coin(input five, input ten, input expect_vend);
        begin
            c5 = five; c10 = ten; #1;
            if (vend !== expect_vend) bad = bad + 1;
            if (vend) sales = sales + 1;
            @(posedge clk); #1; c5 = 0; c10 = 0;
        end
    endtask

    initial begin
        repeat (2) @(posedge clk); #1 rst = 0;
        coin(1, 0, 0); coin(1, 0, 0); coin(1, 0, 1);   // 5+5+5
        coin(0, 1, 0); coin(1, 0, 1);                  // 10+5
        coin(1, 0, 0); coin(0, 1, 1);                  // 5+10
        coin(0, 1, 0); coin(0, 1, 1);                  // 10+10 (сдача не нужна)
        if (bad == 0 && sales == 4) $display("vending: OK"); else $display("vending: ОШИБОК %0d, продаж %0d", bad, sales);
        $finish;
    end
endmodule
