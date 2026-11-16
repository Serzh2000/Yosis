// «Охранная панель» целиком: ядро guard_panel, фильтр входов in_filter и верхний модуль для платы Tang Nano 20K.

// ===== Ядро: вся логика панели. Не знает ни про плату, ни про кнопки. =====
module guard_panel #(
    parameter TONE = 13,         // разряд счётчика для тона (27 МГц: около 1,6 кГц)
    parameter GAP  = 22          // разряд для паузы между гудками (около 3,2 Гц)
) (
    input        clk, rst,                     // такт и синхронный сброс
    input        door, window, motion,         // датчики, 1 = сработал
    input        night,                        // ночной режим
    input  [3:0] noise,                        // уровень шума
    input        arm_btn,                      // «поставить на охрану»
    input        code_bit, code_step,          // ввод кода: бит и импульс «принять»
    output       alarm_led, armed_led,
    output       siren,
    output reg [1:0] state
);
    localparam OFF = 2'd0, ARMED = 2'd1, ALARM = 2'd2;

    // Этапы 2, 3, 6: комбинационная часть
    wire vote     = (door & window) | (door & motion) | (window & motion);
    wire loud     = noise > 4'd9;
    wire intruder = vote | loud | (door & night);

    // Этап 9: ввод кода 1-0-1 и фронт кнопки
    reg [2:0] hist;
    reg       arm_d;
    always @(posedge clk) begin
        arm_d <= arm_btn;
        if (rst)            hist <= 3'b000;
        else if (code_step) hist <= {hist[1:0], code_bit};
    end
    wire arm_pulse = arm_btn & ~arm_d;
    wire unlock    = code_step & ({hist[1:0], code_bit} == 3'b101);

    // Этапы 7 и 9: автомат OFF -> ARMED -> ALARM (ALARM запоминается до верного кода)
    always @(posedge clk) begin
        if (rst) state <= OFF;
        else case (state)
            OFF:     if (arm_pulse) state <= ARMED;
            ARMED:   if (unlock)        state <= OFF;
                     else if (intruder) state <= ALARM;
            ALARM:   if (unlock) state <= OFF;
            default: state <= OFF;
        endcase
    end

    // Этап 8: счётчик для писка (тон и пауза)
    reg [23:0] cnt;
    always @(posedge clk) cnt <= rst ? 24'd0 : cnt + 24'd1;

    assign alarm_led = (state == ALARM);
    assign armed_led = (state == ARMED);
    assign siren     = alarm_led & cnt[GAP] & cnt[TONE];
endmodule

// ===== Вход с кнопки или датчика: два триггера (синхронизация) и фильтр дребезга. =====
module in_filter #(
    parameter N    = 270_000,    // сколько тактов значение должно держаться (10 мс при 27 МГц)
    parameter INIT = 1'b0        // значение «до первого измерения»
) (
    input      clk,
    input      raw,              // сигнал снаружи, не связанный с тактом
    output reg clean = INIT
);
    reg s1 = INIT, s2 = INIT;
    reg [18:0] cnt = 19'd0;
    always @(posedge clk) begin
        s1 <= raw;
        s2 <= s1;
        if (s2 == clean)          cnt <= 19'd0;
        else if (cnt == N - 1) begin clean <= s2; cnt <= 19'd0; end
        else                      cnt <= cnt + 19'd1;
    end
endmodule

// ===== Верхний модуль для платы: порты соответствуют файлу panel_top.cst. =====
module panel_top (
    input        clk,            // кварц 27 МГц
    input  [1:0] btn,            // S1 = btn[0] = бит 0, S2 = btn[1] = бит 1 кода (нажата = 1)
    input        door_pin, window_pin, motion_pin, night_pin, arm_pin,   // выключатели на землю, разъём J5
    output       buzzer,
    output [5:0] led             // светодиоды горят при 0
);
    // Сброс при включении: 16 тактов после подачи питания
    reg [4:0] por = 5'd0;
    wire rst = ~por[4];
    always @(posedge clk) if (rst) por <= por + 5'd1;

    // Фильтры. Выключатели «на землю»: 1 на ножке = не сработал, поэтому INIT = 1 и инверсия.
    wire door_f, window_f, motion_f, night_f, arm_f, b0_f, b1_f;
    in_filter #(.INIT(1'b1)) f_door   (.clk(clk), .raw(door_pin),   .clean(door_f));
    in_filter #(.INIT(1'b1)) f_window (.clk(clk), .raw(window_pin), .clean(window_f));
    in_filter #(.INIT(1'b1)) f_motion (.clk(clk), .raw(motion_pin), .clean(motion_f));
    in_filter #(.INIT(1'b1)) f_night  (.clk(clk), .raw(night_pin),  .clean(night_f));
    in_filter #(.INIT(1'b1)) f_arm    (.clk(clk), .raw(arm_pin),    .clean(arm_f));
    in_filter                f_b0     (.clk(clk), .raw(btn[0]),     .clean(b0_f));
    in_filter                f_b1     (.clk(clk), .raw(btn[1]),     .clean(b1_f));

    // Ввод кода двумя кнопками: нажатие любой даёт импульс «принять», S2 --- бит 1, S1 --- бит 0
    reg any_d = 1'b0;
    always @(posedge clk) any_d <= b0_f | b1_f;
    wire code_step = (b0_f | b1_f) & ~any_d;
    wire code_bit  = b1_f;

    wire alarm_led, armed_led, siren;
    wire [1:0] state;
    guard_panel panel (
        .clk(clk), .rst(rst),
        .door(~door_f), .window(~window_f), .motion(~motion_f), .night(~night_f),
        .noise(4'd0),                          // датчика шума на плате нет (см. главу про АЦП)
        .arm_btn(~arm_f),
        .code_bit(code_bit), .code_step(code_step),
        .alarm_led(alarm_led), .armed_led(armed_led), .siren(siren), .state(state)
    );

    assign buzzer = siren;
    assign led    = ~{3'b000, state == 2'd0, armed_led, alarm_led};   // led[0] = тревога, led[1] = охрана, led[2] = выкл
endmodule
