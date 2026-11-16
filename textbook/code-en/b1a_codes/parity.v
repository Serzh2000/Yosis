// Example 4. Parity bit: the transmitter pads the digit to an even number of ones, the receiver catches an error.
module parity_tx (
    input  [3:0] d,         // data (a BCD digit)
    output [4:0] word       // word: the parity bit is the top bit
);
    wire p = ^d;            // ^d is XOR of all bits: 1 if the number of ones is odd
    assign word = {p, d};   // now the word has an even number of ones
endmodule

module parity_rx (
    input  [4:0] word,      // received word
    output       err        // 1 = odd number of ones, the word is damaged
);
    assign err = ^word;     // for an intact word the result must be 0
endmodule
