// Example 3. A 1:4 demultiplexer: the input goes to one output, the others are 0.
module demux4 (
    input        x,           // data input
    input  [1:0] s,           // output address
    output reg [3:0] y        // y[i] = x if s = i, else 0
);
    always @(*) begin
        y = 4'b0000;          // the default value: y is assigned on every path, so there is no latch
        case (s)
            2'd0: y[0] = x;
            2'd1: y[1] = x;
            2'd2: y[2] = x;
            2'd3: y[3] = x;
        endcase
    end
endmodule

// The same in one line: a decoder with an enable input.
module demux4_shift (
    input        x,
    input  [1:0] s,
    output [3:0] y
);
    assign y = {3'b000, x} << s;   // x (a one or a zero) is shifted by s positions
endmodule
