// Registers: with write enable, a shift register and a clock divider.
module reg_en #(parameter W = 8) (
    input              clk,
    input              rst,       // synchronous reset
    input              en,        // write enable
    input      [W-1:0] d,
    output reg [W-1:0] q
);
    always @(posedge clk) begin
        if (rst)     q <= {W{1'b0}};
        else if (en) q <= d;      // otherwise q keeps its old value
    end
endmodule

module shift4 (
    input            clk,
    input            rst,
    input            din,         // the new bit enters from the right
    output reg [3:0] q
);
    always @(posedge clk) begin
        if (rst) q <= 4'd0;
        else     q <= {q[2:0], din};   // shift left by one position
    end
endmodule

module clk_div #(parameter N = 4) (
    input      clk,
    input      rst,
    output reg tick              // one clock of 1 every N clocks
);
    reg [15:0] cnt;
    always @(posedge clk) begin
        if (rst) begin
            cnt  <= 16'd0;
            tick <= 1'b0;
        end else if (cnt == N - 1) begin
            cnt  <= 16'd0;
            tick <= 1'b1;
        end else begin
            cnt  <= cnt + 16'd1;
            tick <= 1'b0;
        end
    end
endmodule
