// Синхронная очередь FIFO на 8 слов по 8 бит (глава «Проектирование автоматов»).
// Данные выходят в том порядке, в каком вошли. Память --- массив, два указателя
// (записи и чтения) бегут по кругу, счётчик слов говорит «пусто» и «полно».
module fifo8 (
    input            clk,
    input            rst,
    input            wr,        // записать din
    input            rd,        // прочитать слово в dout
    input      [7:0] din,
    output reg [7:0] dout,
    output           empty,
    output           full
);
    reg [7:0] mem [0:7];
    reg [2:0] wp, rp;           // указатели записи и чтения
    reg [3:0] count;            // сколько слов хранится: 0..8

    assign empty = (count == 4'd0);
    assign full  = (count == 4'd8);

    wire do_wr = wr && !full;
    wire do_rd = rd && !empty;

    always @(posedge clk) begin
        if (rst) begin
            wp <= 3'd0; rp <= 3'd0; count <= 4'd0; dout <= 8'd0;
        end else begin
            if (do_wr) begin
                mem[wp] <= din;
                wp <= wp + 3'd1;            // 3-разрядный указатель сам «заворачивается» через 7
            end
            if (do_rd) begin
                dout <= mem[rp];
                rp <= rp + 3'd1;
            end
            count <= count + do_wr - do_rd;
        end
    end
endmodule
