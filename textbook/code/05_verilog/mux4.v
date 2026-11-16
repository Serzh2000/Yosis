// Мультиплексор 4:1 двумя способами: вложенный ?: и case.
module mux4_tern (
    input  [3:0] d,          // четыре информационных входа
    input  [1:0] s,          // номер выбранного входа
    output       y
);
    assign y = s[1] ? (s[0] ? d[3] : d[2])
                    : (s[0] ? d[1] : d[0]);
endmodule

module mux4_case (
    input  [3:0] d,
    input  [1:0] s,
    output reg   y
);
    always @(*) begin
        case (s)
            2'd0:    y = d[0];
            2'd1:    y = d[1];
            2'd2:    y = d[2];
            default: y = d[3];   // default обязателен: иначе получится защёлка
        endcase
    end
endmodule
