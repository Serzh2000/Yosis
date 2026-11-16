// Детектор переднего фронта: один импульс длиной в такт на каждое нажатие.
module edge_det (
    input  clk,
    input  in,
    output pulse
);
    reg prev = 1'b0;
    always @(posedge clk) prev <= in;   // значение in в прошлом такте
    assign pulse = in & ~prev;          // сейчас 1, раньше 0
endmodule
