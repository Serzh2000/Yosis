// Пример 3. Сумматор-вычитатель: при sub = 1 считает a - b как a + ~b + 1.
module addsub4 (
    input  [3:0] a, b,
    input        sub,                 // 0 --- сложение, 1 --- вычитание
    output [3:0] s,
    output       cout                 // перенос из старшего разряда
);
    wire [3:0] bx = b ^ {4{sub}};     // четыре XOR: при sub = 1 инвертируют все биты b
    assign {cout, s} = a + bx + sub;  // sub идёт и во вход переноса: это и есть «+1»
endmodule
