// Пример 2. Мультиплексор 4:1: через case, через индексацию шины и деревом из трёх мультиплексоров 2:1.
module mux4_case (
    input  [3:0] x,           // информационные входы x0..x3
    input  [1:0] s,           // адрес: номер входа
    output reg   y
);
    always @(*) begin
        case (s)
            2'd0:    y = x[0];
            2'd1:    y = x[1];
            2'd2:    y = x[2];
            default: y = x[3];    // s = 3; default закрывает и x/z-значения адреса
        endcase
    end
endmodule

module mux4_index (
    input  [3:0] x,
    input  [1:0] s,
    output       y
);
    assign y = x[s];              // индекс бита шины и есть мультиплексор
endmodule

module mux4_tree (
    input  [3:0] x,
    input  [1:0] s,
    output       y
);
    wire m0 = s[0] ? x[1] : x[0];    // уровень 1: младший бит адреса выбирает в паре (x0,x1)
    wire m1 = s[0] ? x[3] : x[2];    // уровень 1: то же в паре (x2,x3)
    assign y = s[1] ? m1 : m0;       // уровень 2: старший бит выбирает между парами
endmodule
