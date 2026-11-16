// D-триггер с входом разрешения en (clock enable): при en = 0 хранит значение.
module dff_en (
    input      clk,
    input      en,
    input      d,
    output reg q = 1'b0
);
    always @(posedge clk) begin
        if (en) q <= d;      // иначе q не меняется: синтезатор поставит мультиплексор
    end
endmodule
