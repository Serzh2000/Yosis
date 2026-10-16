// Пример 5. Светофор -- конечный автомат (FSM).
// led[0] -- красный, led[1] -- жёлтый, led[2] -- зелёный.
module traffic_light (
    input  wire       clk,
    input  wire [1:0] btn,        // btn[0] -- сброс
    output wire [5:0] led
);
    localparam integer SEC = 27_000_000;

    // Кодирование состояний
    localparam [1:0] RED    = 2'd0,
                     RED_YL = 2'd1,   // красный + жёлтый
                     GREEN  = 2'd2,
                     YELLOW = 2'd3;

    reg [1:0]  state = RED;
    reg [27:0] timer = 0;

    // Сколько тактов длится каждое состояние
    reg [27:0] duration;
    always @(*) begin
        case (state)
            RED:     duration = 4 * SEC;
            RED_YL:  duration = 1 * SEC;
            GREEN:   duration = 4 * SEC;
            YELLOW:  duration = 1 * SEC;
            default: duration = 1 * SEC;
        endcase
    end

    // Регистр состояния и логика переходов
    always @(posedge clk) begin
        if (btn[0]) begin
            state <= RED;
            timer <= 0;
        end else if (timer == duration - 1) begin
            timer <= 0;
            case (state)
                RED:     state <= RED_YL;
                RED_YL:  state <= GREEN;
                GREEN:   state <= YELLOW;
                YELLOW:  state <= RED;
            endcase
        end else begin
            timer <= timer + 1'b1;
        end
    end

    // Выходная логика (автомат Мура: выход зависит только от состояния)
    reg [2:0] lights;             // {зелёный, жёлтый, красный}
    always @(*) begin
        case (state)
            RED:     lights = 3'b001;
            RED_YL:  lights = 3'b011;
            GREEN:   lights = 3'b100;
            YELLOW:  lights = 3'b010;
            default: lights = 3'b001;
        endcase
    end

    assign led = ~{3'b000, lights};
endmodule
