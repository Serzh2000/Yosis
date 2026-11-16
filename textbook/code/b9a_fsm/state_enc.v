// Один и тот же автомат с тремя кодированиями состояний: двоичным, Грея и унитарным.
// Четыре состояния A -> B -> C -> D -> A, переход по go; y = 1 в состояниях C и D.

module ring_bin (                // двоичное: 2 триггера
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

module ring_gray (               // код Грея: 2 триггера, соседние состояния отличаются одним битом
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
    assign y = st[1];            // C = 11 и D = 10: старший бит и есть выход
endmodule

module ring_onehot (             // унитарное: 4 триггера, горит ровно один
    input clk, rst, go,
    output y
);
    reg [3:0] st;                // st[0] = A, st[1] = B, st[2] = C, st[3] = D
    always @(posedge clk) begin
        if (rst) st <= 4'b0001;
        else if (go) st <= {st[2:0], st[3]};   // единица переходит к соседу
    end
    assign y = st[2] | st[3];
endmodule
