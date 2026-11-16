// Synchronous FIFO queue of 8 words of 8 bits (chapter "Designing State Machines").
// Data come out in the order they went in. The memory is an array; two pointers
// (write and read) run in a circle; the word counter tells "empty" and "full".
module fifo8 (
    input            clk,
    input            rst,
    input            wr,        // write din
    input            rd,        // read a word into dout
    input      [7:0] din,
    output reg [7:0] dout,
    output           empty,
    output           full
);
    reg [7:0] mem [0:7];
    reg [2:0] wp, rp;           // write and read pointers
    reg [3:0] count;            // how many words are stored: 0..8

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
                wp <= wp + 3'd1;            // the 3-bit pointer wraps around by itself after 7
            end
            if (do_rd) begin
                dout <= mem[rp];
                rp <= rp + 3'd1;
            end
            count <= count + do_wr - do_rd;
        end
    end
endmodule
