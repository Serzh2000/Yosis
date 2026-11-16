// Цикл for и generate: циклы описывают повторение аппаратуры, а не повторение во времени.

// 1) for внутри always @(*): сумма единичных битов (число единиц в слове)
module popcount8 (
    input      [7:0] d,
    output reg [3:0] n
);
    integer i;
    always @(*) begin
        n = 4'd0;
        for (i = 0; i < 8; i = i + 1)
            n = n + d[i];            // цикл «разворачивается» в 8 сумматоров
    end
endmodule

// 2) generate for: N одинаковых разрядов сумматора, N меняется параметром
module adder_gen #(parameter N = 4) (
    input  [N-1:0] a, b,
    input          cin,
    output [N-1:0] s,
    output         cout
);
    wire [N:0] c;
    assign c[0] = cin;
    genvar i;
    generate
        for (i = 0; i < N; i = i + 1) begin : stage
            assign s[i]   = a[i] ^ b[i] ^ c[i];
            assign c[i+1] = (a[i] & b[i]) | (c[i] & (a[i] ^ b[i]));
        end
    endgenerate
    assign cout = c[N];
endmodule

// 3) function: комбинационная «подпрограмма», у неё нет времени и нет памяти
module parity_fn (
    input  [7:0] d,
    output       p
);
    function parity8(input [7:0] x);
        begin
            parity8 = ^x;
        end
    endfunction
    assign p = parity8(d);
endmodule
