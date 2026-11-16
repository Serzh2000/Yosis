// Полусумматор: два assign работают одновременно (глава «Основы языка Verilog»).
module half_adder (
    input  wire a,    // первое слагаемое
    input  wire b,    // второе слагаемое
    output wire s,    // сумма по модулю 2
    output wire c     // перенос
);
    assign s = a ^ b;
    assign c = a & b;
endmodule
