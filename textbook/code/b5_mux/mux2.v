// Пример 1. Мультиплексор 2:1 тремя способами: оператор ?:, case и вентили.
module mux2_q (
    input  a, b, s,
    output y
);
    assign y = s ? b : a;        // s = 0 -> a, s = 1 -> b
endmodule

module mux2_case (
    input  a, b, s,
    output reg y
);
    always @(*) begin            // комбинационная логика: выход пересчитывается при любом изменении входов
        case (s)
            1'b0:    y = a;
            default: y = b;      // default нужен, чтобы y получал значение при любых s (иначе --- защёлка)
        endcase
    end
endmodule

module mux2_gates (
    input  a, b, s,
    output y
);
    wire ns = ~s;                         // НЕ
    wire t0 = a & ns;                     // И: пропускает a при s = 0
    wire t1 = b & s;                      // И: пропускает b при s = 1
    assign y = t0 | t1;                   // ИЛИ собирает результат
endmodule
