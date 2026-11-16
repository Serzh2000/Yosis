// FIFO queue with parameters: depth 2**AW words, width DW bits.
// The full and empty flags come from pointers with an EXTRA high bit, no word counter is needed.
module fifo_ptr #(
    parameter DW = 8,            // word width
    parameter AW = 3             // address width: 2**AW words
) (
    input               clk,
    input               rst,
    input               wr,      // write din
    input               rd,      // take the word (it is already visible on dout)
    input      [DW-1:0] din,
    output     [DW-1:0] dout,    // the oldest word
    output              empty,
    output              full
);
    reg [DW-1:0] mem [0:(1 << AW) - 1];
    reg [AW:0]   wp, rp;         // one bit wider than the address

    // Pointers equal as a whole: the queue is empty. Addresses equal but the extra bit differs: full.
    assign empty = (wp == rp);
    assign full  = (wp[AW] != rp[AW]) && (wp[AW-1:0] == rp[AW-1:0]);
    assign dout  = mem[rp[AW-1:0]];

    wire do_wr = wr && !full;    // a write to a full queue is ignored
    wire do_rd = rd && !empty;   // a read of an empty queue is ignored

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
