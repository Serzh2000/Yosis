// Управляющий автомат АЦП последовательного приближения (глава «Цифра и аналоговый мир»).
// Внешний компаратор говорит, больше ли входное напряжение, чем то, что даёт ЦАП (код dac).
// За 8 тактов автомат находит код методом бисекции: бит за битом, начиная со старшего.
module sar_adc (
    input            clk,
    input            start,      // запуск измерения
    input            cmp,        // 1, если Uвх >= Uцап
    output reg [7:0] dac,        // код, который сейчас выдан на ЦАП
    output reg [7:0] result,     // готовый результат
    output reg       done        // 1 на один такт, когда result готов
);
    reg [7:0] acc  = 8'd0;       // уже найденные старшие биты
    reg [7:0] mask = 8'd0;       // проверяемый бит (бегущая единица)
    reg       busy = 1'b0;

    // Единицу в проверяемом бите оставляем, только если Uвх не меньше пробного значения
    wire [7:0] acc_n = cmp ? (acc | mask) : acc;

    always @(posedge clk) begin
        done <= 1'b0;
        if (!busy) begin
            if (start) begin
                busy <= 1'b1;
                acc  <= 8'd0;
                mask <= 8'h80;
                dac  <= 8'h80;              // пробуем сначала половину шкалы
            end
        end else begin
            acc <= acc_n;
            if (mask[0]) begin              // самый младший бит проверен
                busy   <= 1'b0;
                done   <= 1'b1;
                result <= acc_n;
            end else begin
                mask <= mask >> 1;
                dac  <= acc_n | (mask >> 1); // следующая проба
            end
        end
    end
endmodule

// Демонстрация без внешних деталей: входное «напряжение» задано константой, компаратор встроен.
module sar_demo (
    input        clk,
    input        start,
    output [7:0] dac,
    output [7:0] result,
    output       done
);
    localparam [7:0] VIN = 8'd179;           // измеряемое «напряжение»
    wire cmp = (VIN >= dac);                 // компаратор: Uвх >= Uцап
    sar_adc u_adc (.clk(clk), .start(start), .cmp(cmp), .dac(dac), .result(result), .done(done));
endmodule
