`timescale 1ns/1ps
module tb_uart;
    reg clk = 0;
    wire tx, rx_valid;
    wire [7:0] rx_data;
    integer got = 0, bad = 0;
    reg [7:0] want = "A";
    uart_demo #(.CLKS_PER_BIT(8)) dut (.clk(clk), .tx(tx), .rx_data(rx_data), .rx_valid(rx_valid));
    always #5 clk = ~clk;

    always @(posedge clk) if (rx_valid) begin
        if (rx_data !== want) begin bad = bad + 1; $display("ждали %c, пришло %c", want, rx_data); end
        want = (want == "Z") ? "A" : want + 1;
        got = got + 1;
    end

    initial begin
        #200000;
        if (bad == 0 && got > 20) $display("uart: OK, принято %0d байт", got);
        else $display("uart: ОШИБОК %0d, принято %0d", bad, got);
        $finish;
    end
endmodule
