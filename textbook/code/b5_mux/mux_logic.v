// Пример 4. Мультиплексор как универсальный вентиль: XOR на 2:1 и любая функция двух переменных на 4:1.
module xor_on_mux (
    input  a, b,
    output y
);
    assign y = a ? ~b : b;        // при a = 0 выход равен b, при a = 1 --- инверсии b: это XOR
endmodule

module mux_lut2 #(
    parameter [3:0] TT = 4'b0110  // столбец таблицы истинности: бит i --- значение при {a,b} = i
) (
    input  a, b,
    output y
);
    assign y = TT[{a, b}];        // адрес {a,b} выбирает одну из четырёх констант TT[0]..TT[3]
endmodule

module and_on_lut (input a, b, output y);
    mux_lut2 #(.TT(4'b1000)) u (.a(a), .b(b), .y(y));    // 1000: единица только при a = b = 1
endmodule

module or_on_lut (input a, b, output y);
    mux_lut2 #(.TT(4'b1110)) u (.a(a), .b(b), .y(y));    // 1110: единица всюду, кроме 00
endmodule
