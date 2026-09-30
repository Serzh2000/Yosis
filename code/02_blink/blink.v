// Пример 2. Мигающий светодиод.
// Счётчик делит частоту 27 МГц до ~1 Гц.
module blink #(
    parameter integer CLK_HZ = 27_000_000     // частоту можно задать снаружи
) (
    input  wire       clk,       // 27 МГц
    output wire [5:0] led
);
    localparam integer HALF = CLK_HZ / 2;     // полпериода = 0,5 с

    reg [24:0] cnt   = 0;        // 2^25 > 13 500 000
    reg        state = 1'b0;

    always @(posedge clk) begin
        if (cnt == HALF - 1) begin
            cnt   <= 0;
            state <= ~state;     // переключаем раз в 0,5 с
        end else begin
            cnt <= cnt + 1'b1;
        end
    end

    assign led = {6{~state}};    // все шесть светодиодов мигают вместе
endmodule
