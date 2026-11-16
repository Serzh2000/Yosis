// «2 из 3» в минимальной форме с карты Карно: y = ab + ac + bc.
module maj3_min (
    input  a, b, c,
    output y
);
    assign y = (a & b) | (a & c) | (b & c);
endmodule
