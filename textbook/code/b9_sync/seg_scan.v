// Образец к заданию «ПЗУ + счётчик адреса»: ПЗУ 8x7 хранит коды сегментов цифр 0..7,
// счётчик адреса по такту перебирает все 8 слов по кругу.
module seg_scan (
    input        clk,
    output [6:0] seg        // сегменты g f e d c b a
);
    reg [2:0] addr = 3'd0;               // счётчик адреса 0..7
    reg [6:0] rom [0:7];                 // ПЗУ 8x7
    initial begin
        rom[0] = 7'h3F; rom[1] = 7'h06; rom[2] = 7'h5B; rom[3] = 7'h4F;
        rom[4] = 7'h66; rom[5] = 7'h6D; rom[6] = 7'h7D; rom[7] = 7'h07;
    end
    always @(posedge clk) addr <= addr + 3'd1;   // после 7 снова 0
    assign seg = rom[addr];
endmodule
