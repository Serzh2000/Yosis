// Bidirectional pin: tri-state output (chapter "Electrical Basics and Buses").
// oe = 1 --- the circuit drives the pin; oe = 0 --- the output is "released" (high-impedance state Z),
// and an external chip can drive the pin in the same way.
module io_pad (
    input        oe,        // output enable
    input  [3:0] to_pad,    // what we drive outside
    inout  [3:0] pad,       // the pin itself
    output [3:0] from_pad   // what we see on the pin
);
    assign pad      = oe ? to_pad : 4'bzzzz;
    assign from_pad = pad;
endmodule
