// Example 1. A 2:1 multiplexer in three ways: the ?: operator, case and gates.
module mux2_q (
    input  a, b, s,
    output y
);
    assign y = s ? b : a;        // s = 0 -> a, s = 1 -> b
endmodule

module mux2_case (
    input  a, b, s,
    output reg y
);
    always @(*) begin            // combinational logic: the output is recomputed on any input change
        case (s)
            1'b0:    y = a;
            default: y = b;      // default makes y assigned for every s (otherwise a latch appears)
        endcase
    end
endmodule

module mux2_gates (
    input  a, b, s,
    output y
);
    wire ns = ~s;                         // NOT
    wire t0 = a & ns;                     // AND: passes a when s = 0
    wire t1 = b & s;                      // AND: passes b when s = 1
    assign y = t0 | t1;                   // OR collects the result
endmodule
