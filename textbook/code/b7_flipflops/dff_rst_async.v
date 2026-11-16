// D-триггер с АСИНХРОННЫМ сбросом: rst действует сразу, не дожидаясь фронта.
module dff_rst_async (
    input      clk,
    input      rst,
    input      d,
    output reg q
);
    always @(posedge clk or posedge rst) begin   // список чувствительности: и clk, и rst
        if (rst) q <= 1'b0;
        else     q <= d;
    end
endmodule
