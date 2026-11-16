// D flip-flop with an enable input en (clock enable): holds its value when en = 0.
module dff_en (
    input      clk,
    input      en,
    input      d,
    output reg q = 1'b0
);
    always @(posedge clk) begin
        if (en) q <= d;      // otherwise q is unchanged: the synthesizer adds a multiplexer
    end
endmodule
