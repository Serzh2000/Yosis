`timescale 1ns/1ps
module tb;
  reg a, b; wire sum, carry;
  integer i;
  half_adder dut(.a(a), .b(b), .sum(sum), .carry(carry));
  task check(input [1:0] n);
    begin
      {a, b} = n; #1;
      if (sum === (a ^ b)) $display("CHECK PASS sum a=%b b=%b", a, b);
      else $display("CHECK FAIL sum: при a=%b b=%b ожидалось %b, получено %b", a, b, a ^ b, sum);
      if (carry === (a & b)) $display("CHECK PASS carry a=%b b=%b", a, b);
      else $display("CHECK FAIL carry: при a=%b b=%b ожидалось %b, получено %b", a, b, a & b, carry);
    end
  endtask
  initial begin for (i = 0; i < 4; i = i + 1) check(i[1:0]); $finish; end
endmodule
