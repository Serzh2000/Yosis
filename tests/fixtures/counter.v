`timescale 1ns/1ps

module counter(input clk, input reset, input enable, output reg [7:0] count);
  always @(posedge clk)
    if (reset) count <= 8'd0;
    else if (enable) count <= count + 8'd1;
endmodule

module tb;
  reg clk = 0;
  reg reset = 1;
  reg enable = 1;
  wire [7:0] count;
  counter dut(clk, reset, enable, count);

  always #5 clk = ~clk;
  initial begin
    $dumpfile("tests/fixtures/counter.vcd");
    $dumpvars(0, tb);
    repeat (2) @(negedge clk);
    reset = 0;
    repeat (6) @(negedge clk);
    $finish;
  end
endmodule
