// Three states in Verilog: a buffer, and the "right" bus built on a multiplexer.

// 1) Three-state buffer: oe = 1 passes d, oe = 0 releases the line (Z).
module tri_buf (
    input  oe,
    input  d,
    output pin
);
    assign pin = oe ? d : 1'bz;
endmodule

// 2) There are no shared wires inside the chip: a multiplexer chooses the source.
module bus_mux (
    input        sel,            // 0 --- a talks, 1 --- b talks
    input  [3:0] a, b,
    output [3:0] bus
);
    assign bus = sel ? b : a;    // a single assignment: one source at any moment
endmodule
