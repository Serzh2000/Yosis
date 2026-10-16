// Пример 3. Бегущий огонь на кольцевом сдвиговом регистре.
module running_lights (
    input  wire       clk,       // 27 МГц
    output wire [5:0] led
);
    // Делитель: импульс tick длиной в один такт 8 раз в секунду
    localparam integer DIV = 27_000_000 / 8;

    reg [21:0] cnt  = 0;
    reg        tick = 1'b0;

    always @(posedge clk) begin
        if (cnt == DIV - 1) begin
            cnt  <= 0;
            tick <= 1'b1;
        end else begin
            cnt  <= cnt + 1'b1;
            tick <= 1'b0;
        end
    end

    // Кольцевой сдвиговый регистр: единица "бежит" по кругу
    reg [5:0] ring = 6'b000001;

    always @(posedge clk) begin
        if (tick)
            ring <= {ring[4:0], ring[5]};   // циклический сдвиг влево
    end

    assign led = ~ring;
endmodule
