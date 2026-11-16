// 3->8 decoder from two 2->4 decoders (the figure in the chapter): the top bit picks the half.
module dec2to4_blk (
    input  [1:0] a,
    input        en,
    output [3:0] y
);
    assign y = en ? (4'b0001 << a) : 4'b0000;
endmodule

module dec3to8_cascade (
    input  [2:0] a,
    input        en,
    output [7:0] y
);
    dec2to4_blk low  (.a(a[1:0]), .en(en & ~a[2]), .y(y[3:0]));   // numbers 0..3
    dec2to4_blk high (.a(a[1:0]), .en(en &  a[2]), .y(y[7:4]));   // numbers 4..7
endmodule
