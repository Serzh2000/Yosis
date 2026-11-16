// The same 101 detector as a Mealy machine: the output depends on the input too, so the one
// rises in the same cycle in which the last bit arrives (one cycle earlier than in the Moore machine).
module fsm101_mealy (
    input  clk,
    input  rst,
    input  x,
    output y
);
    localparam S0 = 2'd0, S1 = 2'd1, S2 = 2'd2;   // three states: S3 is not needed
    reg [1:0] state, next;

    always @(posedge clk) begin
        if (rst) state <= S0;
        else     state <= next;
    end

    always @* begin
        case (state)
            S0:      next = x ? S1 : S0;
            S1:      next = x ? S1 : S2;
            S2:      next = x ? S1 : S0;       // after 101 the last 1 starts a new triple
            default: next = S0;
        endcase
    end

    assign y = (state == S2) && x;             // Mealy: state AND input
endmodule
