// Двоичный код -> код Грея: g = b ^ (b >> 1). Все XOR работают параллельно.
module bin2gray (
    input  [2:0] b,
    output [2:0] g
);
    assign g = b ^ (b >> 1);        // g2 = b2, g1 = b2^b1, g0 = b1^b0
endmodule
