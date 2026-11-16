// Two-stage pipeline: y = a*b + c. The result appears 2 cycles after the inputs,
// but new a, b, c are accepted EVERY cycle. Each stage is shorter, so the clock can be faster.
module pipe2 (
    input            clk,
    input      [3:0] a, b, c,
    output reg [8:0] y
);
    reg [7:0] prod;          // register between stages 1 and 2
    reg [3:0] c1;            // c must also be delayed by one cycle to travel together with a, b
    always @(posedge clk) begin
        prod <= a * b;       // stage 1: multiplication
        c1   <= c;
        y    <= prod + c1;   // stage 2: addition
    end
endmodule
