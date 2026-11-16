// Traffic light: 4 clocks of green, 2 of yellow, 4 of red, for three rounds.
`timescale 1ns/1ps
module tb_traffic3;
    reg        clk = 0, rst = 1;
    wire [2:0] lamp;
    integer k, m, bad = 0;
    reg  [2:0] expect_lamp;

    traffic3 #(.G(4), .Y(2), .R(4)) dut (.clk(clk), .rst(rst), .lamp(lamp));
    always #5 clk = ~clk;

    initial begin
        repeat (2) @(posedge clk);
        #1 rst = 0;                              // clocks are counted from this moment
        for (k = 0; k < 30; k = k + 1) begin
            m = k % 10;
            expect_lamp = (m < 4) ? 3'b001 : (m < 6) ? 3'b010 : 3'b100;
            if (lamp !== expect_lamp) begin
                bad = bad + 1;
                $display("clock %0d: lamp=%b, expected %b", k, lamp, expect_lamp);
            end
            @(posedge clk); #1;
        end
        if (bad == 0) $display("traffic3: OK"); else $display("traffic3: ERRORS %0d", bad);
        $finish;
    end
endmodule
