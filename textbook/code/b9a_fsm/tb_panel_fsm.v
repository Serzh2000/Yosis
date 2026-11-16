// Сценарий приёмки этапа 9: код -> ОХРАНА, дверь -> сирена, код -> тишина; в режиме ВЫКЛ дверь сирену не включает.
`timescale 1ns/1ps
module tb_panel_fsm;
    reg  clk = 0, rst = 1, d = 0, code_bit = 0;
    wire siren;
    wire [1:0] mode;
    integer bad = 0;

    panel_fsm dut (.clk(clk), .rst(rst), .d(d), .code_bit(code_bit), .siren(siren), .mode(mode));
    always #5 clk = ~clk;

    task tick;
        begin @(posedge clk); #1; end
    endtask
    task enter(input b2, input b1, input b0);    // ввести три бита кода
        begin
            code_bit = b2; tick;
            code_bit = b1; tick;
            code_bit = b0; tick;
            code_bit = 0;  tick;                 // пауза: c приходит в такте последнего бита, режим меняется следом
        end
    endtask

    initial begin
        repeat (2) @(posedge clk); #1 rst = 0;
        d = 1; tick; tick;                       // (в) дверь в режиме ВЫКЛ: сирены нет
        if (siren !== 1'b0 || mode !== 2'd0) bad = bad + 1;
        d = 0; tick;
        enter(1, 0, 1);                          // (а) код -> ОХРАНА
        if (mode !== 2'd1) bad = bad + 1;
        d = 1; tick;                             // (б) дверь -> сирена со следующего такта
        if (siren !== 1'b1 || mode !== 2'd2) bad = bad + 1;
        d = 0; tick; tick;
        if (siren !== 1'b1) bad = bad + 1;       // закрыли дверь, тревога держится
        enter(1, 0, 1);                          // (г) код -> тишина
        if (siren !== 1'b0 || mode !== 2'd0) bad = bad + 1;
        if (bad == 0) $display("panel_fsm: OK"); else $display("panel_fsm: ОШИБОК %0d", bad);
        $finish;
    end
endmodule
