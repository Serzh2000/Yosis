module tb;
    reg clk = 0;
    always #5 clk = ~clk;
    wire [5:0] led_n;
    top #(.HALF_PERIOD(4)) dut(.clk(clk), .led_n(led_n));
    integer cycle;
    reg [5:0] expected;
    initial begin
        #1;
        if (led_n !== 6'b101010) $fatal(1, "Wrong initial LED mask");
        for (cycle = 1; cycle <= 20; cycle = cycle + 1) begin
            @(posedge clk); #1;
            expected = ((cycle / 4) % 2) ? 6'b010101 : 6'b101010;
            if (led_n !== expected) $fatal(1, "Wrong LED mask at cycle %0d", cycle);
        end
        $display("PASS: five alternating LED phases, three LEDs lit in each phase");
        $finish;
    end
endmodule
