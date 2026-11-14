import type { Design } from './rtl-gowin-harness';

/**
 * Корпус небольших дизайнов, каждый из которых проверяет одну возможность синтеза.
 * Поле `rtl`/`tech` — что обязано оказаться в нетлисте; `count` — точное число примитивов.
 */
export const corpus: Design[] = [
  {
    id: 'wire',
    top: 'top',
    src: `module top(input a, output y); assign y = a; endmodule`,
    techNot: ['LUT1', 'LUT2'],
  },
  {
    id: 'not',
    top: 'top',
    src: `module top(input a, output y); assign y = ~a; endmodule`,
    tech: ['LUT1', 'IBUF', 'OBUF'],
    count: { LUT1: 1, IBUF: 1, OBUF: 1 },
  },
  {
    id: 'and4',
    top: 'top',
    src: `module top(input a, input b, input c, input d, output y); assign y = a & b & c & d; endmodule`,
    // 4 входа помещаются ровно в одну таблицу LUT4.
    count: { LUT4: 1, IBUF: 4, OBUF: 1 },
  },
  {
    id: 'xor-chain-8',
    top: 'top',
    src: `module top(input [7:0] a, output y); assign y = ^a; endmodule`,
    rtl: ['$reduce_xor'],
    // 8 входов: две LUT4 + одна LUT2 на объединение (или LUT3/MUX2_LUT5) — не больше 3 LUT.
    tech: ['LUT4'],
  },
  {
    id: 'mux2-vector',
    top: 'top',
    src: `module top(input s, input [3:0] a, input [3:0] b, output [3:0] y); assign y = s ? a : b; endmodule`,
    rtl: ['$mux'],
    count: { LUT3: 4, IBUF: 9, OBUF: 4 },
  },
  {
    id: 'case-mux4',
    top: 'top',
    src: `module top(input [1:0] s, input [3:0] d, output reg y);
  always @* case (s) 2'd0: y = d[0]; 2'd1: y = d[1]; 2'd2: y = d[2]; default: y = d[3]; endcase
endmodule`,
    rtl: ['$pmux'],
  },
  {
    id: 'adder8',
    top: 'top',
    src: `module top(input [7:0] a, input [7:0] b, output [8:0] y); assign y = a + b; endmodule`,
    rtl: ['$add'],
    tech: ['ALU'],
  },
  {
    id: 'sub-signed',
    top: 'top',
    src: `module top(input signed [7:0] a, input signed [7:0] b, output signed [8:0] y); assign y = a - b; endmodule`,
    rtl: ['$sub'],
    tech: ['ALU'],
  },
  {
    id: 'compare',
    top: 'top',
    src: `module top(input [7:0] a, input [7:0] b, output lt, output eq, output ge); assign lt = a < b; assign eq = a == b; assign ge = a >= b; endmodule`,
    rtl: ['$lt', '$eq', '$ge'],
  },
  {
    id: 'multiplier-4x4',
    top: 'top',
    src: `module top(input [3:0] a, input [3:0] b, output [7:0] y); assign y = a * b; endmodule`,
    rtl: ['$mul'],
    tech: ['MULT9X9'],
    skipFormal: 'умножитель DSP: у MULT9X9 нет открытой модели',
    skipSim: 'умножитель DSP: у MULT9X9 нет открытой модели',
  },
  {
    id: 'barrel-shift',
    top: 'top',
    src: `module top(input [7:0] a, input [2:0] n, output [7:0] l, output [7:0] r); assign l = a << n; assign r = a >> n; endmodule`,
    rtl: ['$shl', '$shr'],
  },
  {
    id: 'bitwise-8',
    top: 'top',
    src: `module top(input [7:0] a, input [7:0] b, output [7:0] y1, output [7:0] y2, output [7:0] y3, output [7:0] y4);
  assign y1 = a & b; assign y2 = a | b; assign y3 = a ^ b; assign y4 = ~a;
endmodule`,
    // До 8 бит схема показывает по вентилю на разряд, как настоящая схема из вентилей.
    rtl: ['$_AND_', '$_OR_', '$_XOR_', '$_NOT_'],
    rtlNot: ['$and', '$or', '$xor', '$not'],
  },
  {
    id: 'constants',
    top: 'top',
    src: `module top(output [3:0] y, output z, output o); assign y = 4'b1010; assign z = 1'b0; assign o = 1'b1; endmodule`,
    tech: ['GND', 'VCC'],
  },
  {
    id: 'counter-sync-reset',
    top: 'top',
    sequential: true,
    src: `module top(input clk, input rst, input en, output reg [7:0] q);
  always @(posedge clk) if (rst) q <= 0; else if (en) q <= q + 1;
endmodule`,
    rtl: ['$sdffe', '$add'],
    tech: ['ALU'],
  },
  {
    id: 'counter-async-reset',
    top: 'top',
    sequential: true,
    src: `module top(input clk, input rst, output reg [3:0] q);
  always @(posedge clk or posedge rst) if (rst) q <= 0; else q <= q + 1;
endmodule`,
    rtl: ['$adff'],
    tech: ['DFFC'],
  },
  {
    id: 'dff-negedge',
    top: 'top',
    sequential: true,
    src: `module top(input clk, input d, output reg q = 1'b0); always @(negedge clk) q <= d; endmodule`,
    tech: ['DFFN'],
  },
  {
    id: 'dff-set-and-enable',
    top: 'top',
    sequential: true,
    src: `module top(input clk, input set, input ce, input [3:0] d, output reg [3:0] q = 4'b0);
  always @(posedge clk) if (set) q <= 4'hF; else if (ce) q <= d;
endmodule`,
    tech: ['DFF'],
  },
  {
    id: 'shift-register',
    top: 'top',
    sequential: true,
    src: `module top(input clk, input d, output q);
  reg [7:0] s = 8'h00; always @(posedge clk) s <= {s[6:0], d}; assign q = s[7];
endmodule`,
  },
  {
    id: 'fsm-3state',
    top: 'top',
    sequential: true,
    src: `module top(input clk, input rst, input go, output reg busy, output reg done);
  localparam IDLE = 2'd0, RUN = 2'd1, FIN = 2'd2;
  reg [1:0] st = IDLE;
  always @(posedge clk) begin
    if (rst) st <= IDLE; else case (st)
      IDLE: if (go) st <= RUN;
      RUN: st <= FIN;
      FIN: st <= IDLE;
      default: st <= IDLE;
    endcase
  end
  always @* begin busy = (st == RUN); done = (st == FIN); end
endmodule`,
  },
  {
    id: 'rom-case',
    top: 'top',
    src: `module top(input [3:0] a, output reg [7:0] y);
  always @* case (a)
    0: y = 8'h3F; 1: y = 8'h06; 2: y = 8'h5B; 3: y = 8'h4F; 4: y = 8'h66; 5: y = 8'h6D;
    6: y = 8'h7D; 7: y = 8'h07; 8: y = 8'h7F; 9: y = 8'h6F; default: y = 8'h00;
  endcase
endmodule`,
  },
  {
    id: 'ram-sync',
    top: 'top',
    sequential: true,
    skipFormal:
      'память: после синтеза в BSRAM/RAM16 поведение при чтении неинициализированных ячеек не определено',
    src: `module top(input clk, input we, input [5:0] addr, input [7:0] din, output reg [7:0] dout);
  reg [7:0] mem [0:63]; integer i;
  initial begin for (i = 0; i < 64; i = i + 1) mem[i] = 8'h00; dout = 8'h00; end
  always @(posedge clk) begin if (we) mem[addr] <= din; dout <= mem[addr]; end
endmodule`,
    rtl: ['$memwr_v2', '$memrd'],
  },
  {
    id: 'hierarchy-two-levels',
    top: 'top',
    src: `module half(input a, input b, output s, output c); assign s = a ^ b; assign c = a & b; endmodule
module full(input a, input b, input ci, output s, output co);
  wire s1, c1, c2;
  half h1(.a(a), .b(b), .s(s1), .c(c1));
  half h2(.a(s1), .b(ci), .s(s), .c(c2));
  assign co = c1 | c2;
endmodule
module top(input [3:0] a, input [3:0] b, output [3:0] s, output co);
  wire [4:0] c; assign c[0] = 1'b0;
  genvar i;
  generate for (i = 0; i < 4; i = i + 1) begin : g
    full f(.a(a[i]), .b(b[i]), .ci(c[i]), .s(s[i]), .co(c[i+1]));
  end endgenerate
  assign co = c[4];
endmodule`,
    rtl: ['full', 'half'],
  },
  {
    id: 'parameterised-module',
    top: 'top',
    sequential: true,
    src: `module reg_n #(parameter W = 4)(input clk, input [W-1:0] d, output reg [W-1:0] q); always @(posedge clk) q <= d; endmodule
module top(input clk, input [7:0] d, output [7:0] q1, output [2:0] q2);
  reg_n #(.W(8)) a(.clk(clk), .d(d), .q(q1));
  reg_n #(.W(3)) b(.clk(clk), .d(d[2:0]), .q(q2));
endmodule`,
  },
  {
    id: 'multiple-files',
    top: 'top',
    src: [
      {
        name: 'top.v',
        content: `module top(input a, input b, output y); inv u(.a(a & b), .y(y)); endmodule`,
      },
      { name: 'lib/inv.v', content: `module inv(input a, output y); assign y = ~a; endmodule` },
    ],
  },
  {
    id: 'tristate-inout',
    top: 'top',
    src: `module top(input oe, input d, inout pad, output q); assign pad = oe ? d : 1'bz; assign q = pad; endmodule`,
    tech: ['IOBUF'],
    skipFormal: 'трёхстабильный вывод: двунаправленный порт нельзя сравнить как вход/выход',
    skipSim: 'inout-порт нельзя вести тестбенчем как обычный вход',
  },
  {
    id: 'tristate-output',
    top: 'top',
    src: `module top(input oe, input d, output y); assign y = oe ? d : 1'bz; endmodule`,
    tech: ['TBUF'],
    skipFormal: 'выход в состоянии z',
    skipSim: 'выход в состоянии z',
  },
  {
    id: 'priority-encoder',
    top: 'top',
    src: `module top(input [7:0] r, output reg [2:0] y, output reg v);
  integer i;
  always @* begin y = 0; v = 0; for (i = 0; i < 8; i = i + 1) if (r[i]) begin y = i[2:0]; v = 1; end end
endmodule`,
  },
  {
    id: 'signed-arith',
    top: 'top',
    src: `module top(input signed [7:0] a, input signed [7:0] b, output signed [15:0] p, output gt, output signed [7:0] sh);
  assign p = a * b; assign gt = a > b; assign sh = a >>> 2;
endmodule`,
    skipFormal: 'умножитель DSP: у MULT9X9 нет открытой модели',
    skipSim: 'умножитель DSP: у MULT9X9 нет открытой модели',
  },
  {
    id: 'unused-and-dead-logic',
    top: 'top',
    src: `module top(input a, input b, output y); wire unused = a ^ b; reg [7:0] dead; assign y = a; endmodule`,
    techNot: ['LUT2'],
  },
  {
    id: 'pwm-like-counter-compare',
    top: 'top',
    sequential: true,
    src: `module top(input clk, input [7:0] duty, output pwm);
  reg [7:0] c = 8'h00; always @(posedge clk) c <= c + 1; assign pwm = c < duty;
endmodule`,
  },
  {
    id: 'gowin-primitive-instance',
    top: 'top',
    skipFormal:
      'в схеме готовый примитив кристалла: у него нет поведенческой модели, пригодной для доказательства',
    src: `module top(input clk, output y);
  wire lock, clkout;
  rPLL #(.FCLKIN("27"), .IDIV_SEL(2), .FBDIV_SEL(8), .ODIV_SEL(8), .DEVICE("GW2AR-18C")) pll(
    .CLKIN(clk), .CLKOUT(clkout), .LOCK(lock), .CLKOUTP(), .CLKOUTD(), .CLKOUTD3(), .RESET(1'b0), .RESET_P(1'b0),
    .CLKFB(1'b0), .FBDSEL(6'b0), .IDSEL(6'b0), .ODSEL(6'b0), .PSDA(4'b0), .DUTYDA(4'b0), .FDLY(4'b0));
  reg [3:0] n = 0; always @(posedge clkout) n <= n + 1;
  assign y = n[3] & lock;
endmodule`,
    tech: ['rPLL'],
    skipSim: 'у rPLL нет поведенческой модели',
  },
  {
    id: 'bitwise-16-wide',
    top: 'top',
    // Широкие векторы остаются словами: схема не должна превращаться в лес вентилей.
    src: `module top(input [15:0] a, input [15:0] b, output [15:0] y); assign y = a & b; endmodule`,
    rtl: ['$and'],
    rtlNot: ['$_AND_'],
  },
  {
    id: 'bram-2k',
    top: 'top',
    sequential: true,
    skipFormal: 'блочная память: нет SAT-модели примитива',
    skipSim: 'SPX9: у блочной памяти нет открытой поведенческой модели (только чёрный ящик)',
    src: `module top(input clk, input we, input [10:0] a, input [7:0] din, output reg [7:0] dout);
  reg [7:0] mem [0:2047]; integer i;
  initial begin for (i = 0; i < 2048; i = i + 1) mem[i] = 8'h00; dout = 8'h00; end
  always @(posedge clk) begin if (we) mem[a] <= din; dout <= mem[a]; end
endmodule`,
    rtl: ['$memwr_v2', '$memrd'],
    count: { SPX9: 1 },
  },
  {
    id: 'latch',
    top: 'top',
    skipFormal: 'защёлка: проверка по тактам не применима',
    skipSim: 'защёлка: нет тактового входа',
    src: `module top(input en, input d, output reg q); always @* if (en) q = d; endmodule`,
    tech: ['DL'],
  },
];
