// RS-защёлка из двух элементов ИЛИ-НЕ (рис. «RS-триггер»): петля обратной связи на assign.
module sr_latch (
    input  s,        // установить (Set):  s = 1 -> q = 1
    input  r,        // сбросить (Reset):  r = 1 -> q = 0
    output q,
    output qn        // инверсный выход
);
    assign q  = ~(r | qn);   // верхний ИЛИ-НЕ
    assign qn = ~(s | q);    // нижний ИЛИ-НЕ
endmodule
