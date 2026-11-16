// The same encoder built from "gates": two OR gates (y0 = x1 + x3, y1 = x2 + x3).
module enc4to2_or (
    input  [3:0] x,
    output [1:0] y
);
    assign y[0] = x[1] | x[3];
    assign y[1] = x[2] | x[3];
endmodule
