// Three typical mistakes and their fixes. Each pair has a "bad" and a "good" module.

// 1) Latch: when en = 0 nothing is assigned to q, so it "remembers" the old value
module latch_bad (
    input      en, d,
    output reg q
);
    always @(*) begin
        if (en) q = d;
    end
endmodule

module latch_ok (
    input      en, d,
    output reg q
);
    always @(*) begin
        if (en) q = d;
        else    q = 1'b0;            // the value is defined under every condition
    end
endmodule

// 2) Blocking assignment in a clocked block: the "swap" does not work
module swap_bad (
    input      clk, rst,
    output reg a, b
);
    always @(posedge clk) begin
        if (rst) begin a <= 1'b1; b <= 1'b0; end
        else begin
            a = b;                   // a has already changed
            b = a;                   // and the new a goes here, that is b = b
        end
    end
endmodule

module swap_ok (
    input      clk, rst,
    output reg a, b
);
    always @(posedge clk) begin
        if (rst) begin a <= 1'b1; b <= 1'b0; end
        else begin
            a <= b;                  // both right-hand sides are taken "before the edge"
            b <= a;
        end
    end
endmodule
