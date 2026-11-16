// Пример 6. Код Грея: перевод двоичного числа в код Грея и обратно.
module bin2gray (
    input  [3:0] b,
    output [3:0] g
);
    assign g = b ^ (b >> 1);        // старший бит копируется, остальные = сумма по модулю 2 соседних
endmodule

module gray2bin (
    input  [3:0] g,
    output [3:0] b
);
    // каждый бит двоичного числа = XOR всех битов Грея, начиная со старшего
    assign b[3] = g[3];
    assign b[2] = g[3] ^ g[2];
    assign b[1] = g[3] ^ g[2] ^ g[1];
    assign b[0] = g[3] ^ g[2] ^ g[1] ^ g[0];
endmodule
