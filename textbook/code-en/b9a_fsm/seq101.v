// 1-0-1 sequence detector with overlap: a Mealy machine "in three blocks".
module seq101 (
    input  clk,
    input  rst,
    input  x,                    // the next bit, one per clock
    output hit                   // 1 in the clock when the last bit arrives
);
    localparam [1:0] S0 = 2'd0,  // nothing useful seen
                     S1 = 2'd1,  // seen "1"
                     S10 = 2'd2; // seen "10"

    reg [1:0] state, next;

    // Block 1. State register.
    always @(posedge clk) begin
        if (rst) state <= S0;
        else     state <= next;
    end

    // Block 2. Transitions. A one can always start a new sequence (overlap).
    always @(*) begin
        next = state;
        case (state)
            S0:      next = x ? S1 : S0;
            S1:      next = x ? S1 : S10;
            S10:     next = x ? S1 : S0;
            default: next = S0;
        endcase
    end

    // Block 3. Mealy output: depends on the state AND on the input x.
    assign hit = (state == S10) && x;
endmodule
