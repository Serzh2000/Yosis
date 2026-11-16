// ОЗУ 16x8 с синхронной записью и синхронным чтением (так память хранится в блоках ПЛИС).
// Чтение занимает такт: dout показывает содержимое ячейки, которое было ДО этого фронта.
module ram16x8 (
    input            clk,
    input            we,       // 1 = записать din по адресу addr
    input      [3:0] addr,
    input      [7:0] din,
    output reg [7:0] dout
);
    reg [7:0] mem [0:15];
    always @(posedge clk) begin
        if (we) mem[addr] <= din;   // запись по фронту
        dout <= mem[addr];          // чтение по фронту: слово появится на следующем такте
    end
endmodule
