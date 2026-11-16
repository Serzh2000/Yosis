// 3->8 decoder with enable in one line: shift a one left by a positions.
module dec3to8 (
    input  [2:0] a,
    input        en,
    output [7:0] y
);
    assign y = en ? (8'b0000_0001 << a) : 8'b0000_0000;
endmodule
