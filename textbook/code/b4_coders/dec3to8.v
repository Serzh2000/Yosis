// Дешифратор 3->8 с разрешением одной строкой: единицу сдвигаем на a позиций.
module dec3to8 (
    input  [2:0] a,
    input        en,
    output [7:0] y
);
    assign y = en ? (8'b0000_0001 << a) : 8'b0000_0000;
endmodule
