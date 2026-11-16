// Half adder: two assign statements work at the same time (chapter "Verilog basics").
module half_adder (
    input  wire a,    // first addend
    input  wire b,    // second addend
    output wire s,    // sum modulo 2
    output wire c     // carry
);
    assign s = a ^ b;
    assign c = a & b;
endmodule
