// Example 9. A tiny 8-bit processor: accumulator, 16 bytes of data memory, program ROM.
// An instruction is 8 bits: [7:4] --- opcode, [3:0] --- operand (a number or an address).
//
//   0 NOP         do nothing
//   1 LDI k       acc <= k            (load a number 0..15)
//   2 ADD a       acc <= acc + RAM[a]
//   3 STA a       RAM[a] <= acc
//   4 LDA a       acc <= RAM[a]
//   5 SUB a       acc <= acc - RAM[a]
//   6 JMP a       pc <= a
//   7 JZ  a       if acc == 0, then pc <= a
//   8 OUT         out <= acc          (show the result)
//   9 HLT         stop
//
// Each instruction takes two clock cycles: FETCH (read the instruction from ROM) and EXECUTE.
module tiny_cpu (
    input        clk,
    input        rst,
    output reg [7:0] out,        // value of the last OUT instruction
    output reg [3:0] pc,         // program counter
    output reg [7:0] acc         // accumulator
);
    // ----- Program read-only memory: Fibonacci numbers -----
    function [7:0] rom(input [3:0] a);
        case (a)
            4'd0:  rom = 8'h11;  // LDI 1
            4'd1:  rom = 8'h31;  // STA 1       b = 1
            4'd2:  rom = 8'h10;  // LDI 0
            4'd3:  rom = 8'h30;  // STA 0       a = 0
            4'd4:  rom = 8'h40;  // LDA 0       <-- start of the loop
            4'd5:  rom = 8'h80;  // OUT         show a
            4'd6:  rom = 8'h21;  // ADD 1       acc = a + b
            4'd7:  rom = 8'h32;  // STA 2       t = a + b
            4'd8:  rom = 8'h41;  // LDA 1
            4'd9:  rom = 8'h30;  // STA 0       a = b
            4'd10: rom = 8'h42;  // LDA 2
            4'd11: rom = 8'h31;  // STA 1       b = t
            4'd12: rom = 8'h64;  // JMP 4
            default: rom = 8'h90; // HLT
        endcase
    endfunction

    reg [7:0] ram [0:15];          // data memory (a memory block; it has no reset)
    reg [7:0] ir;                // instruction register
    reg       phase;             // 0 --- fetch, 1 --- execute
    reg       halted;

    wire [3:0] op  = ir[7:4];
    wire [3:0] arg = ir[3:0];

    always @(posedge clk) begin
        if (rst) begin
            pc <= 4'd0; acc <= 8'd0; out <= 8'd0; ir <= 8'd0;
            phase <= 1'b0; halted <= 1'b0;
        end else if (!halted) begin
            if (!phase) begin                       // FETCH
                ir    <= rom(pc);
                pc    <= pc + 4'd1;
                phase <= 1'b1;
            end else begin                          // EXECUTE
                phase <= 1'b0;
                case (op)
                    4'd1: acc <= {4'd0, arg};
                    4'd2: acc <= acc + ram[arg];
                    4'd3: ram[arg] <= acc;
                    4'd4: acc <= ram[arg];
                    4'd5: acc <= acc - ram[arg];
                    4'd6: pc  <= arg;
                    4'd7: if (acc == 8'd0) pc <= arg;
                    4'd8: out <= acc;
                    4'd9: halted <= 1'b1;
                    default: ;
                endcase
            end
        end
    end
endmodule
