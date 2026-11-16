// Пример 2. Четырёхразрядный сумматор: цепочка переноса в цикле и одна строка assign.
module add4_loop (
    input  [3:0] a, b,
    input        cin,
    output reg [3:0] s,
    output reg       cout
);
    integer i;
    reg [4:0] c;                               // c[i] --- перенос в разряд i; c[4] --- выходной
    always @(*) begin
        c[0] = cin;
        for (i = 0; i < 4; i = i + 1) begin    // цикл «разворачивается» в четыре полных сумматора
            s[i]   = a[i] ^ b[i] ^ c[i];
            c[i+1] = (a[i] & b[i]) | (a[i] & c[i]) | (b[i] & c[i]);   // «2 из 3»
        end
        cout = c[4];
    end
endmodule

module add4_assign (
    input  [3:0] a, b,
    input        cin,
    output [3:0] s,
    output       cout
);
    assign {cout, s} = a + b + cin;            // 5-битная сумма: старший бит --- перенос
endmodule
