// Up/down counter: up = 1 counts up, up = 0 counts down; overflow wraps around.
module cnt_updown (
    input            clk,
    input            rst,
    input            en,
    input            up,
    output reg [3:0] q
);
    always @(posedge clk) begin
        if (rst)      q <= 4'd0;
        else if (en)  q <= up ? q + 4'd1 : q - 4'd1;
    end
endmodule
