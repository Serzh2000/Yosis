// Moore machine: a 101 sequence detector with overlap (graph in the figure "Transition graph").
// Three parts: (1) the state register, (2) the transition logic, (3) the output logic.
module fsm101 (
    input  clk,
    input  rst,       // synchronous reset to S0
    input  x,         // input bit, one per clock cycle
    output y          // 1 when 101 has been received
);
    localparam S0 = 2'd0,    // nothing found
               S1 = 2'd1,    // received "1"
               S2 = 2'd2,    // received "10"
               S3 = 2'd3;    // received "101"
    reg [1:0] state, next;

    // (1) state register
    always @(posedge clk) begin
        if (rst) state <= S0;
        else     state <= next;
    end

    // (2) transition logic: from the transition table, for EVERY state and EVERY x
    always @* begin
        case (state)
            S0:      next = x ? S1 : S0;
            S1:      next = x ? S1 : S2;
            S2:      next = x ? S3 : S0;
            S3:      next = x ? S1 : S2;   // overlap: the last 1 may start a new triple
            default: next = S0;            // protection against undefined codes
        endcase
    end

    // (3) output logic (Moore: depends on the state only)
    assign y = (state == S3);
endmodule
