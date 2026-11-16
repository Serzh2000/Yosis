// Shift register "parallel load -> serial out":
// load = 1 stores the whole word, otherwise the contents are shifted out most significant bit first.
module shift_piso (
    input        clk,
    input        load,
    input  [3:0] d,
    output       dout
);
    reg [3:0] sr = 4'b0000;
    always @(posedge clk) begin
        if (load) sr <= d;                 // "load / shift" multiplexer in front of the flip-flops
        else      sr <= {sr[2:0], 1'b0};   // shift left
    end
    assign dout = sr[3];
endmodule
