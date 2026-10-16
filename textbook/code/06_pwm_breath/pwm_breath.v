// Пример 6. "Дышащий" светодиод на ШИМ.
module pwm_breath (
    input  wire       clk,        // 27 МГц
    output wire [5:0] led
);
    // Генератор ШИМ: 8-битный счётчик -> частота 27 МГц / 256 ~ 105 кГц
    reg [7:0] pwm_cnt = 0;
    always @(posedge clk) pwm_cnt <= pwm_cnt + 1'b1;

    // Медленно меняем скважность: 0 -> 255 -> 0 примерно за 2 секунды
    localparam integer STEP = 27_000_000 / 512;
    reg [16:0] step_cnt = 0;
    reg [7:0]  duty     = 0;
    reg        up       = 1'b1;

    always @(posedge clk) begin
        if (step_cnt == STEP - 1) begin
            step_cnt <= 0;
            if (up) begin
                if (duty == 8'd255) up <= 1'b0; else duty <= duty + 1'b1;
            end else begin
                if (duty == 8'd0)   up <= 1'b1; else duty <= duty - 1'b1;
            end
        end else begin
            step_cnt <= step_cnt + 1'b1;
        end
    end

    // Компаратор: выход равен 1, пока счётчик меньше заданной скважности
    wire pwm = (pwm_cnt < duty);

    assign led = {6{~pwm}};
endmodule
