// Example 2. A four-bit adder: the carry chain in a loop and a single assign line.
module add4_loop (
    input  [3:0] a, b,
    input        cin,
    output reg [3:0] s,
    output reg       cout
);
    integer i;
    reg [4:0] c;                               // c[i] is the carry into bit i; c[4] is the output carry
    always @(*) begin
        c[0] = cin;
        for (i = 0; i < 4; i = i + 1) begin    // the loop unrolls into four full adders
            s[i]   = a[i] ^ b[i] ^ c[i];
            c[i+1] = (a[i] & b[i]) | (a[i] & c[i]) | (b[i] & c[i]);   // "2 out of 3"
        end
        cout = c[4];
    end
endmodule

module add4_assign (
    input  [3:0] a, b,
    input        cin,
    output [3:0] s,
    output       cout
);
    assign {cout, s} = a + b + cin;            // a 5-bit sum: the top bit is the carry
endmodule
