// Сдвиговый регистр «параллельная загрузка -> последовательный выход»:
// load = 1 записывает слово целиком, иначе содержимое выталкивается старшим битом вперёд.
module shift_piso (
    input        clk,
    input        load,
    input  [3:0] d,
    output       dout
);
    reg [3:0] sr = 4'b0000;
    always @(posedge clk) begin
        if (load) sr <= d;                 // мультиплексор «загрузка / сдвиг» перед триггерами
        else      sr <= {sr[2:0], 1'b0};   // сдвиг влево
    end
    assign dout = sr[3];
endmodule
