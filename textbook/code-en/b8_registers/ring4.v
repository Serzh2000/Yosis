// Ring register: a single one runs around the ring ("running light" on four LEDs).
module ring4 (
    input        clk,
    input        rst,
    output reg [3:0] q
);
    always @(posedge clk) begin
        if (rst) q <= 4'b0001;               // the initial state MUST be non-zero
        else     q <= {q[2:0], q[3]};        // the top bit returns to the bottom
    end
endmodule
