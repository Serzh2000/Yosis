// Дешифратор 2->4 с разрешением: по одному assign на выход (произведения из главы).
module dec2to4_assign (
    input  [1:0] a,
    input        en,
    output [3:0] y
);
    assign y[0] = en & ~a[1] & ~a[0];
    assign y[1] = en & ~a[1] &  a[0];
    assign y[2] = en &  a[1] & ~a[0];
    assign y[3] = en &  a[1] &  a[0];
endmodule
