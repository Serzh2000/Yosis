// Example 5. Multiplexers on 8-bit buses: 2:1 and 4:1 with a common address for all bits.
module mux2_bus8 (
    input  [7:0] a, b,
    input        s,
    output [7:0] y
);
    assign y = s ? b : a;         // one line switches all eight bits at once
endmodule

module mux4_bus8 (
    input  [7:0] d0, d1, d2, d3,
    input  [1:0] s,
    output reg [7:0] y
);
    always @(*) begin
        case (s)
            2'd0:    y = d0;
            2'd1:    y = d1;
            2'd2:    y = d2;
            default: y = d3;
        endcase
    end
endmodule
