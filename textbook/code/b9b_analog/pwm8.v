// Восьмиразрядный ШИМ. Новый уровень принимается только в начале периода, чтобы импульс не «рвался».
module pwm8 (
    input        clk,
    input  [7:0] level,          // 0..255: сколько тактов из 256 выход равен 1
    output       pwm
);
    reg [7:0] cnt = 8'd0;        // «пила»: считает 0..255 по кругу
    reg [7:0] lvl = 8'd0;        // уровень, действующий в текущем периоде
    always @(posedge clk) begin
        cnt <= cnt + 8'd1;
        if (cnt == 8'hFF) lvl <= level;
    end
    assign pwm = (cnt < lvl);
endmodule
