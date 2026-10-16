// Пример 8. UART 8N1: передатчик, приёмник и демонстрационный «замкнутый на себя» модуль.
// Формат кадра: стартовый бит (0), 8 бит данных младшим вперёд, стоповый бит (1).

// ---------------------------------------------------------------------------
// Передатчик
// ---------------------------------------------------------------------------
module uart_tx #(
    parameter integer CLKS_PER_BIT = 234        // 27 МГц / 115200 бод
) (
    input            clk,
    input            start,                      // импульс: передать байт data
    input      [7:0] data,
    output reg       tx   = 1'b1,                // в покое линия равна 1
    output           busy
);
    localparam IDLE = 1'b0, SEND = 1'b1;
    reg        state = IDLE;
    reg [15:0] clks  = 0;                        // такты внутри одного бита
    reg [3:0]  idx   = 0;                        // номер передаваемого бита кадра 0..9
    reg [9:0]  frame = 10'h3FF;                  // {стоп, данные[7:0], старт}

    assign busy = (state == SEND);

    always @(posedge clk) begin
        case (state)
            IDLE: begin
                tx <= 1'b1;
                if (start) begin
                    frame <= {1'b1, data, 1'b0};
                    clks  <= 0;
                    idx   <= 0;
                    state <= SEND;
                end
            end
            SEND: begin
                tx <= frame[idx];                // выдаём текущий бит кадра
                if (clks == CLKS_PER_BIT - 1) begin
                    clks <= 0;
                    if (idx == 4'd9) state <= IDLE;
                    else             idx <= idx + 4'd1;
                end else begin
                    clks <= clks + 16'd1;
                end
            end
        endcase
    end
endmodule

// ---------------------------------------------------------------------------
// Приёмник: ждёт спад линии (старт), ищет середину каждого бита и читает его
// ---------------------------------------------------------------------------
module uart_rx #(
    parameter integer CLKS_PER_BIT = 234
) (
    input            clk,
    input            rx,
    output reg [7:0] data  = 8'd0,
    output reg       valid = 1'b0                // 1 на один такт, когда байт принят
);
    // Асинхронный вход пропускаем через два триггера (см. главу про тактирование)
    reg rx_s1 = 1'b1, rx_s = 1'b1;
    always @(posedge clk) begin rx_s1 <= rx; rx_s <= rx_s1; end

    localparam IDLE = 2'd0, START = 2'd1, BITS = 2'd2, STOP = 2'd3;
    reg [1:0]  state = IDLE;
    reg [15:0] clks  = 0;
    reg [2:0]  idx   = 0;
    reg [7:0]  shift = 0;

    always @(posedge clk) begin
        valid <= 1'b0;
        case (state)
            IDLE: if (!rx_s) begin               // линия упала: начался стартовый бит
                clks  <= 0;
                state <= START;
            end
            START: begin                         // дойти до середины стартового бита
                if (clks == (CLKS_PER_BIT >> 1)) begin
                    clks  <= 0;
                    idx   <= 0;
                    state <= rx_s ? IDLE : BITS; // помеха, а не старт: вернуться
                end else clks <= clks + 16'd1;
            end
            BITS: begin                          // дальше читаем строго через бит, в его середине
                if (clks == CLKS_PER_BIT - 1) begin
                    clks  <= 0;
                    shift <= {rx_s, shift[7:1]}; // новый бит заходит сверху: младший окажется внизу
                    if (idx == 3'd7) state <= STOP;
                    else             idx <= idx + 3'd1;
                end else clks <= clks + 16'd1;
            end
            STOP: begin
                if (clks == CLKS_PER_BIT - 1) begin
                    data  <= shift;
                    valid <= rx_s;               // стоповый бит обязан быть единицей
                    state <= IDLE;
                end else clks <= clks + 16'd1;
            end
        endcase
    end
endmodule

// ---------------------------------------------------------------------------
// Демонстрация: каждые 60 тактов отправляем следующую букву, приёмник слушает ту же линию
// ---------------------------------------------------------------------------
module uart_demo #(
    parameter integer CLKS_PER_BIT = 8          // для платы: 234
) (
    input        clk,
    output       tx,
    output [7:0] rx_data,
    output       rx_valid
);
    reg [7:0] letter = "A";
    reg [9:0] wait_cnt = 0;
    reg       start = 1'b0;
    wire      busy;

    uart_tx #(.CLKS_PER_BIT(CLKS_PER_BIT)) u_tx (
        .clk(clk), .start(start), .data(letter), .tx(tx), .busy(busy));
    uart_rx #(.CLKS_PER_BIT(CLKS_PER_BIT)) u_rx (
        .clk(clk), .rx(tx), .data(rx_data), .valid(rx_valid));

    always @(posedge clk) begin
        start <= 1'b0;
        if (!busy && !start) begin
            if (wait_cnt == 10'd20) begin
                wait_cnt <= 0;
                start    <= 1'b1;
            end else wait_cnt <= wait_cnt + 10'd1;
        end
        if (start) letter <= (letter == "Z") ? "A" : letter + 8'd1;
    end
endmodule
