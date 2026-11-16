// The same machine with three state encodings: binary, Gray and one-hot.
// Four states A -> B -> C -> D -> A, the transition is on go; y = 1 in states C and D.

module ring_bin (                // binary: 2 flip-flops
    input clk, rst, go,
    output y
);
    localparam [1:0] A = 2'b00, B = 2'b01, C = 2'b10, D = 2'b11;
    reg [1:0] st;
    always @(posedge clk) begin
        if (rst) st <= A;
        else if (go) begin
            case (st)
                A: st <= B;
                B: st <= C;
                C: st <= D;
                default: st <= A;
            endcase
        end
    end
    assign y = (st == C) || (st == D);
endmodule

module ring_gray (               // Gray code: 2 flip-flops, neighbouring states differ in one bit
    input clk, rst, go,
    output y
);
    localparam [1:0] A = 2'b00, B = 2'b01, C = 2'b11, D = 2'b10;
    reg [1:0] st;
    always @(posedge clk) begin
        if (rst) st <= A;
        else if (go) begin
            case (st)
                A: st <= B;
                B: st <= C;
                C: st <= D;
                default: st <= A;
            endcase
        end
    end
    assign y = st[1];            // C = 11 and D = 10: the high bit is the output
endmodule

module ring_onehot (             // one-hot: 4 flip-flops, exactly one is set
    input clk, rst, go,
    output y
);
    reg [3:0] st;                // st[0] = A, st[1] = B, st[2] = C, st[3] = D
    always @(posedge clk) begin
        if (rst) st <= 4'b0001;
        else if (go) st <= {st[2:0], st[3]};   // the one moves to the neighbour
    end
    assign y = st[2] | st[3];
endmodule
