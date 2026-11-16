// Пример 5. АЛУ на четыре бита: пять операций и флаги Z, N, C, V.
module alu4 (
    input  [3:0] a, b,
    input  [2:0] op,         // 000: a+b, 001: a-b, 010: a&b, 011: a|b, 100: a^b
    output reg [3:0] y,      // результат
    output       z,          // Z: результат равен нулю
    output       n,          // N: знак (старший бит результата)
    output reg   c,          // C: перенос из старшего разряда
    output reg   v           // V: знаковое переполнение
);
    wire       sub = (op == 3'b001);
    wire [3:0] bx  = b ^ {4{sub}};              // при вычитании инвертируем b
    wire [4:0] sum = a + bx + sub;              // a + b или a + ~b + 1
    wire       c3  = a[3] ^ bx[3] ^ sum[3];     // перенос В старший разряд

    always @(*) begin
        c = 1'b0;
        v = 1'b0;
        case (op)
            3'b000, 3'b001: begin
                y = sum[3:0];
                c = sum[4];
                v = c3 ^ sum[4];                // V = c3 xor c4
            end
            3'b010:  y = a & b;
            3'b011:  y = a | b;
            3'b100:  y = a ^ b;
            default: y = 4'b0000;
        endcase
    end

    assign z = (y == 4'b0000);
    assign n = y[3];
endmodule
