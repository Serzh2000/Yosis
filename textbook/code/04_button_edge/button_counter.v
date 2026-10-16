// Пример 4. Счётчик нажатий кнопки с подавлением дребезга.
// S1 -- прибавить единицу, S2 -- сбросить. Результат в двоичном виде на LED.
module button_counter (
    input  wire       clk,
    input  wire [1:0] btn,
    output wire [5:0] led
);
    // 1) Синхронизатор: два триггера подряд защищают от метастабильности
    reg [1:0] sync0 = 0, sync1 = 0;
    always @(posedge clk) begin
        sync0 <= btn;
        sync1 <= sync0;
    end

    // 2) Антидребезг: принимаем новое значение, только если оно
    //    держится 10 мс (270 000 тактов по 27 МГц)
    localparam integer STABLE = 270_000;
    reg [18:0] db_cnt = 0;
    reg        s1     = 1'b0;          // "чистое" состояние кнопки S1

    always @(posedge clk) begin
        if (sync1[0] == s1) begin
            db_cnt <= 0;               // ничего не поменялось
        end else if (db_cnt == STABLE - 1) begin
            s1     <= sync1[0];        // изменение подтверждено
            db_cnt <= 0;
        end else begin
            db_cnt <= db_cnt + 1'b1;
        end
    end

    // 3) Детектор переднего фронта: 1 ровно на один такт при нажатии
    reg  s1_prev = 1'b0;
    always @(posedge clk) s1_prev <= s1;
    wire press = s1 & ~s1_prev;

    // 4) Сам счётчик
    reg [5:0] count = 0;
    always @(posedge clk) begin
        if (sync1[1])                  // S2 -- сброс
            count <= 0;
        else if (press)
            count <= count + 1'b1;
    end

    assign led = ~count;
endmodule
