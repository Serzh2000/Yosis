// D latch: transparent when c = 1, holds the last value when c = 0.
// always @* has no else branch -> the synthesizer creates a memory element (a latch).
module d_latch (
    input      c,    // enable (level)
    input      d,
    output reg q
);
    always @* begin
        if (c) q = d;        // when c = 0, q is not assigned -> it holds
    end
endmodule
