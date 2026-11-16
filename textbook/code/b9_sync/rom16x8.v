// ПЗУ 16x8: коды сегментов (gfedcba) для шестнадцатеричных цифр 0..F семисегментного индикатора.
// Массив reg [7:0] mem[0:15] — 16 ячеек по 8 бит; чтение комбинационное: адрес -> данные.
module rom16x8 (
    input  [3:0] addr,
    output [7:0] data
);
    reg [7:0] mem [0:15];
    initial begin
        mem[0]  = 8'h3F;  mem[1]  = 8'h06;  mem[2]  = 8'h5B;  mem[3]  = 8'h4F;
        mem[4]  = 8'h66;  mem[5]  = 8'h6D;  mem[6]  = 8'h7D;  mem[7]  = 8'h07;
        mem[8]  = 8'h7F;  mem[9]  = 8'h6F;  mem[10] = 8'h77;  mem[11] = 8'h7C;
        mem[12] = 8'h39;  mem[13] = 8'h5E;  mem[14] = 8'h79;  mem[15] = 8'h71;
    end
    assign data = mem[addr];   // таблица истинности: адрес выбирает готовое слово
endmodule
