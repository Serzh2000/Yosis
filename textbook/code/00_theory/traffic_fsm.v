// Конечный автомат Мура: светофор (глава «Синхронные схемы, автоматы и память»).
// Зелёный горит 4 такта, жёлтый 2, красный 4. Выходы зависят только от состояния.
module traffic_fsm (
    input            clk,
    input            rst,
    output reg [2:0] lamp,    // {красный, жёлтый, зелёный}
    output reg [1:0] state
);
    localparam GREEN = 2'd0, YELLOW = 2'd1, RED = 2'd2;

    reg [2:0] t;              // сколько тактов прошло в состоянии

    // Память состояния и логика переходов
    always @(posedge clk) begin
        if (rst) begin
            state <= GREEN;
            t     <= 3'd0;
        end else begin
            t <= t + 3'd1;
            case (state)
                GREEN:  if (t == 3'd3) begin state <= YELLOW; t <= 3'd0; end
                YELLOW: if (t == 3'd1) begin state <= RED;    t <= 3'd0; end
                RED:    if (t == 3'd3) begin state <= GREEN;  t <= 3'd0; end
                default: state <= GREEN;
            endcase
        end
    end

    // Выходы Мура: только от состояния
    always @* begin
        case (state)
            GREEN:   lamp = 3'b001;
            YELLOW:  lamp = 3'b010;
            default: lamp = 3'b100;
        endcase
    end
endmodule
