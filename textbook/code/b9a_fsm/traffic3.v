// Светофор: автомат Мура «в три блока». Длительности задаются параметрами.
module traffic3 #(
    parameter G = 4,             // такты зелёного
    parameter Y = 2,             // такты жёлтого
    parameter R = 4              // такты красного
) (
    input            clk,
    input            rst,
    output reg [2:0] lamp        // {красный, жёлтый, зелёный}
);
    localparam [1:0] S_GREEN = 2'd0, S_YELLOW = 2'd1, S_RED = 2'd2;

    reg [1:0] state, next;
    reg [7:0] t;                 // сколько тактов прошло в состоянии

    wire last = (state == S_GREEN  && t == G - 1)
             || (state == S_YELLOW && t == Y - 1)
             || (state == S_RED    && t == R - 1);

    // Блок 1. Регистры: состояние и счётчик тактов. Здесь нет логики, только запоминание.
    always @(posedge clk) begin
        if (rst) begin
            state <= S_GREEN;
            t     <= 8'd0;
        end else begin
            state <= next;
            t     <= last ? 8'd0 : t + 8'd1;
        end
    end

    // Блок 2. Логика переходов: следующее состояние. По умолчанию остаёмся на месте.
    always @(*) begin
        next = state;
        case (state)
            S_GREEN:  if (last) next = S_YELLOW;
            S_YELLOW: if (last) next = S_RED;
            S_RED:    if (last) next = S_GREEN;
            default:  next = S_GREEN;      // неиспользуемый код 3 ведёт в начало
        endcase
    end

    // Блок 3. Логика выходов: зависит только от состояния (автомат Мура).
    always @(*) begin
        case (state)
            S_GREEN:  lamp = 3'b001;
            S_YELLOW: lamp = 3'b010;
            default:  lamp = 3'b100;
        endcase
    end
endmodule
