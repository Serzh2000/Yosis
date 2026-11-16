// Mealy machine: a vending machine selling for 15 rubles (chapter "Designing State Machines").
// It accepts coins of 5 and 10 rubles. The vend output depends on both the state and the inputs:
// the item is dispensed in the same clock cycle in which the last coin is inserted.
module vending (
    input      clk,
    input      rst,
    input      c5,      // 5-ruble coin (for one clock cycle)
    input      c10,     // 10-ruble coin
    output     vend     // dispense the item
);
    localparam S0 = 2'd0, S5 = 2'd1, S10 = 2'd2;   // how many rubles have been inserted
    reg [1:0] state, next;

    // State register
    always @(posedge clk)
        if (rst) state <= S0;
        else     state <= next;

    // Transition logic
    always @* begin
        next = state;
        case (state)
            S0:  if (c10) next = S10; else if (c5) next = S5;
            S5:  if (c10) next = S0;  else if (c5) next = S10;
            S10: if (c10 | c5) next = S0;
            default: next = S0;
        endcase
    end

    // Mealy output logic: depends on the state AND on the inputs
    assign vend = (state == S5  &&  c10)
               || (state == S10 && (c5 | c10));
endmodule
