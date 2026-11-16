// Реверсивный счётчик: up = 1 считает вверх, up = 0 вниз; переполнение замыкается по кругу.
module cnt_updown (
    input            clk,
    input            rst,
    input            en,
    input            up,
    output reg [3:0] q
);
    always @(posedge clk) begin
        if (rst)      q <= 4'd0;
        else if (en)  q <= up ? q + 4'd1 : q - 4'd1;
    end
endmodule
