// Очередь FIFO с параметрами: глубина 2**AW слов, ширина DW бит.
// Признаки full и empty берутся из указателей с ЛИШНИМ старшим битом, счётчик слов не нужен.
module fifo_ptr #(
    parameter DW = 8,            // разрядность слова
    parameter AW = 3             // разрядность адреса: слов 2**AW
) (
    input               clk,
    input               rst,
    input               wr,      // записать din
    input               rd,      // забрать слово (оно уже видно на dout)
    input      [DW-1:0] din,
    output     [DW-1:0] dout,    // самое старое слово
    output              empty,
    output              full
);
    reg [DW-1:0] mem [0:(1 << AW) - 1];
    reg [AW:0]   wp, rp;         // на один бит шире адреса

    // Указатели равны целиком: очередь пуста. Равны адреса, но лишний бит разный: полна.
    assign empty = (wp == rp);
    assign full  = (wp[AW] != rp[AW]) && (wp[AW-1:0] == rp[AW-1:0]);
    assign dout  = mem[rp[AW-1:0]];

    wire do_wr = wr && !full;    // запись в полную очередь игнорируется
    wire do_rd = rd && !empty;   // чтение пустой очереди игнорируется

    always @(posedge clk) begin
        if (rst) begin
            wp <= 0;
            rp <= 0;
        end else begin
            if (do_wr) begin
                mem[wp[AW-1:0]] <= din;
                wp <= wp + 1'b1;
            end
            if (do_rd) rp <= rp + 1'b1;
        end
    end
endmodule
