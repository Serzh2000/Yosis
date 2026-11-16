// Автомат режимов «Охранной панели»: ОХРАНА_ВЫКЛ -> ОХРАНА -> ТРЕВОГА, режим меняет верный код 1-0-1.
// В файле два автомата: детектор кода (Мили) и автомат режимов (Мура), соединённые сигналом c.

// Детектор кода: то же, что seq101, переименован, чтобы файл был самодостаточным.
module code_detector (
    input  clk, rst, x,
    output c
);
    localparam [1:0] S0 = 2'd0, S1 = 2'd1, S10 = 2'd2;
    reg [1:0] state;
    always @(posedge clk) begin
        if (rst) state <= S0;
        else case (state)
            S0:      state <= x ? S1 : S0;
            S1:      state <= x ? S1 : S10;
            S10:     state <= x ? S1 : S0;
            default: state <= S0;
        endcase
    end
    assign c = (state == S10) && x;
endmodule

module panel_modes (
    input            clk,
    input            rst,
    input            d,          // дверь открыта
    input            c,          // верный код введён
    output           siren,
    output reg [1:0] mode
);
    localparam [1:0] OFF = 2'd0, ARMED = 2'd1, ALARM = 2'd2;
    reg [1:0] next;

    // Блок 1: регистр состояния
    always @(posedge clk) begin
        if (rst) mode <= OFF;
        else     mode <= next;
    end

    // Блок 2: переходы (все четыре комбинации d, c описаны для каждого режима)
    always @(*) begin
        next = mode;
        case (mode)
            OFF:     if (c) next = ARMED;
            ARMED:   if (c) next = OFF;
                     else if (d) next = ALARM;
            ALARM:   if (c) next = OFF;
            default: next = OFF;
        endcase
    end

    // Блок 3: выход Мура
    assign siren = (mode == ALARM);
endmodule

module panel_fsm (
    input        clk,
    input        rst,
    input        d,              // датчик двери
    input        code_bit,       // вводимый бит кода, один за такт
    output       siren,
    output [1:0] mode
);
    wire c;
    code_detector u_code (.clk(clk), .rst(rst), .x(code_bit), .c(c));
    panel_modes   u_mode (.clk(clk), .rst(rst), .d(d), .c(c), .siren(siren), .mode(mode));
endmodule
