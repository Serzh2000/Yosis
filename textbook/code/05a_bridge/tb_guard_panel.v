// Приёмка «Охранной панели» (ядро guard_panel): охрана, три причины тревоги, память тревоги, код 1-0-1.
`timescale 1ns/1ps
module tb_guard_panel;
    reg        clk = 0, rst = 1;
    reg        door = 0, window = 0, motion = 0, night = 0, arm_btn = 0, code_bit = 0, code_step = 0;
    reg  [3:0] noise = 0;
    wire       alarm_led, armed_led, siren;
    wire [1:0] state;
    integer    bad = 0, k, beeps_on, beeps_off;

    // малые номера разрядов, чтобы писк был виден за десятки тактов
    guard_panel #(.TONE(1), .GAP(3)) dut (
        .clk(clk), .rst(rst), .door(door), .window(window), .motion(motion), .night(night),
        .noise(noise), .arm_btn(arm_btn), .code_bit(code_bit), .code_step(code_step),
        .alarm_led(alarm_led), .armed_led(armed_led), .siren(siren), .state(state));
    always #5 clk = ~clk;

    task tick;  begin @(posedge clk); #1; end endtask
    task press_arm;  begin arm_btn = 1; tick; arm_btn = 0; tick; end endtask
    task code(input b2, input b1, input b0);
        begin
            code_bit = b2; code_step = 1; tick; code_step = 0; tick;
            code_bit = b1; code_step = 1; tick; code_step = 0; tick;
            code_bit = b0; code_step = 1; tick; code_step = 0; tick;
        end
    endtask
    task expect_state(input [1:0] s);
        begin
            if (state !== s) begin
                bad = bad + 1;
                $display("состояние %0d, ожидалось %0d", state, s);
            end
        end
    endtask

    initial begin
        repeat (3) tick;
        rst = 0; tick;
        // (1) в OFF датчики не действуют
        door = 1; window = 1; noise = 4'd12; tick; tick;
        expect_state(2'd0);
        door = 0; window = 0; noise = 0; tick;
        // (2) кнопка ставит на охрану; один датчик из трёх тревоги не даёт
        press_arm;
        expect_state(2'd1);
        window = 1; tick; tick;
        expect_state(2'd1);
        window = 0; tick;
        // (3) два датчика из трёх: тревога; закрытие тревогу не снимает; сирена то гудит, то молчит
        door = 1; motion = 1; tick; tick;
        expect_state(2'd2);
        door = 0; motion = 0;
        beeps_on = 0; beeps_off = 0;
        for (k = 0; k < 32; k = k + 1) begin tick; if (siren) beeps_on = beeps_on + 1; else beeps_off = beeps_off + 1; end
        expect_state(2'd2);
        if (beeps_on == 0 || beeps_off == 0 || !alarm_led || armed_led) bad = bad + 1;
        // (4) неверный код тревогу не снимает, верный снимает
        code(1, 1, 0);
        expect_state(2'd2);
        code(0, 0, 0);
        code(1, 0, 1);
        expect_state(2'd0);
        if (siren !== 1'b0 || alarm_led !== 1'b0) bad = bad + 1;
        // (5) шум выше 9 и дверь ночью
        press_arm; noise = 4'd9; tick; tick; expect_state(2'd1);
        noise = 4'd10; tick; tick; expect_state(2'd2);
        noise = 0; code(0, 0, 0); code(1, 0, 1); expect_state(2'd0);
        press_arm; night = 1; door = 1; tick; tick; expect_state(2'd2);
        door = 0; night = 0; code(0, 0, 0); code(1, 0, 1);
        expect_state(2'd0);
        if (bad == 0) $display("guard_panel: OK"); else $display("guard_panel: ОШИБОК %0d", bad);
        $finish;
    end
endmodule
