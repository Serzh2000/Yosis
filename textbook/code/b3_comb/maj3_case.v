// «2 из 3» таблицей: case по склеенным входам {a,b,c}, строки повторяют таблицу истинности.
module maj3_case (
    input  a, b, c,
    output reg y
);
    always @* begin
        case ({a, b, c})
            3'b000: y = 1'b0;
            3'b001: y = 1'b0;
            3'b010: y = 1'b0;
            3'b011: y = 1'b1;
            3'b100: y = 1'b0;
            3'b101: y = 1'b1;
            3'b110: y = 1'b1;
            3'b111: y = 1'b1;
        endcase
    end
endmodule
