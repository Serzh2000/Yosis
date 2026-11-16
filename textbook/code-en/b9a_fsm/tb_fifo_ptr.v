// An 8-word queue against a simple model: full check of full, empty and word order.
`timescale 1ns/1ps
module tb_fifo_ptr;
    reg        clk = 0, rst = 1, wr = 0, rd = 0;
    reg  [7:0] din = 0;
    wire [7:0] dout;
    wire       empty, full;
    integer k, bad = 0;

    reg  [7:0] model [0:1023];   // model: an array and two integer indices
    integer    head = 0, tail = 0, cnt = 0;
    reg        w, r;

    fifo_ptr #(.DW(8), .AW(3)) dut (.clk(clk), .rst(rst), .wr(wr), .rd(rd), .din(din), .dout(dout), .empty(empty), .full(full));
    always #5 clk = ~clk;

    task check;                                  // compare the flags and the word shown
        begin
            if (empty !== (cnt == 0)) bad = bad + 1;
            if (full  !== (cnt == 8)) bad = bad + 1;
            if (cnt > 0 && dout !== model[head]) bad = bad + 1;
        end
    endtask

    task step(input do_w, input do_r);           // one clock: apply wr/rd, update the model
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
        for (k = 0; k < 12; k = k + 1) step(1, 0);        // 12 writes in a row: 4 extra ones are lost
        for (k = 0; k < 12; k = k + 1) step(0, 1);        // 12 reads in a row
        for (k = 0; k < 400; k = k + 1) step($random, $random);   // a random mix
        for (k = 0; k < 10; k = k + 1) step(0, 1);        // read the rest
        #1; check;
        if (!empty) bad = bad + 1;
        if (bad == 0) $display("fifo_ptr: OK"); else $display("fifo_ptr: ERRORS %0d", bad);
        $finish;
    end
endmodule
