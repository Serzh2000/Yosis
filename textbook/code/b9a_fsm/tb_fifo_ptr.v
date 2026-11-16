// Очередь на 8 слов против простой модели: полная проверка full, empty и порядка слов.
`timescale 1ns/1ps
module tb_fifo_ptr;
    reg        clk = 0, rst = 1, wr = 0, rd = 0;
    reg  [7:0] din = 0;
    wire [7:0] dout;
    wire       empty, full;
    integer k, bad = 0;

    reg  [7:0] model [0:1023];   // модель: массив и два целых индекса
    integer    head = 0, tail = 0, cnt = 0;
    reg        w, r;

    fifo_ptr #(.DW(8), .AW(3)) dut (.clk(clk), .rst(rst), .wr(wr), .rd(rd), .din(din), .dout(dout), .empty(empty), .full(full));
    always #5 clk = ~clk;

    task check;                                  // сверка признаков и выдаваемого слова
        begin
            if (empty !== (cnt == 0)) bad = bad + 1;
            if (full  !== (cnt == 8)) bad = bad + 1;
            if (cnt > 0 && dout !== model[head]) bad = bad + 1;
        end
    endtask

    task step(input do_w, input do_r);           // один такт: подать wr/rd, обновить модель
        begin
            wr = do_w; rd = do_r; din = $random;
            #1; check;
            w = do_w && cnt < 8;
            r = do_r && cnt > 0;
            if (w) begin model[tail] = din; tail = tail + 1; end
            if (r) head = head + 1;
            cnt = cnt + (w ? 1 : 0) - (r ? 1 : 0);
            @(posedge clk); #1;
        end
    endtask

    initial begin
        repeat (2) @(posedge clk); #1 rst = 0;
        for (k = 0; k < 12; k = k + 1) step(1, 0);        // 12 записей подряд: 4 лишние теряются
        for (k = 0; k < 12; k = k + 1) step(0, 1);        // 12 чтений подряд
        for (k = 0; k < 400; k = k + 1) step($random, $random);   // случайная смесь
        for (k = 0; k < 10; k = k + 1) step(0, 1);        // дочитываем остаток
        #1; check;
        if (!empty) bad = bad + 1;
        if (bad == 0) $display("fifo_ptr: OK"); else $display("fifo_ptr: ОШИБОК %0d", bad);
        $finish;
    end
endmodule
