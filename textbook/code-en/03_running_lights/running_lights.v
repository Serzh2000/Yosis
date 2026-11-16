// Example 3. Running lights on a ring shift register.
module running_lights (
    input  wire       clk,       // 27 MHz
    output wire [5:0] led
);
    // Divider: a tick pulse one clock cycle long, 8 times per second
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

    // Ring shift register: a one "runs" in a circle
    reg [5:0] ring = 6'b000001;

    always @(posedge clk) begin
        if (tick)
            ring <= {ring[4:0], ring[5]};   // cyclic shift left
    end

    assign led = ~ring;
endmodule
