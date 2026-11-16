// Example 5. A four-bit ALU: five operations and the flags Z, N, C, V.
module alu4 (
    input  [3:0] a, b,
    input  [2:0] op,         // 000: a+b, 001: a-b, 010: a&b, 011: a|b, 100: a^b
    output reg [3:0] y,      // result
    output       z,          // Z: the result is zero
    output       n,          // N: sign (the top bit of the result)
    output reg   c,          // C: carry out of the top bit
    output reg   v           // V: signed overflow
);
    wire       sub = (op == 3'b001);
    wire [3:0] bx  = b ^ {4{sub}};              // invert b when subtracting
    wire [4:0] sum = a + bx + sub;              // a + b or a + ~b + 1
    wire       c3  = a[3] ^ bx[3] ^ sum[3];     // carry INTO the top bit

    always @(*) begin
        c = 1'b0;
        v = 1'b0;
        case (op)
            3'b000, 3'b001: begin
                y = sum[3:0];
                c = sum[4];
                v = c3 ^ sum[4];                // V = c3 xor c4
            end
            3'b010:  y = a & b;
            3'b011:  y = a | b;
            3'b100:  y = a ^ b;
            default: y = 4'b0000;
        endcase
    end

    assign z = (y == 4'b0000);
    assign n = y[3];
endmodule
