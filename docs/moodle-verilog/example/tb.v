// Тестбенч преподавателя для задания «Полусумматор»: модуль half_adder(a, b, sum, carry).
`timescale 1ns/1ps
module tb;
  reg a, b;
  wire sum, carry;
  integer i;

  half_adder dut (.a(a), .b(b), .sum(sum), .carry(carry));

  task check(input [1:0] n);
    begin
      {a, b} = n;
      #1;
      if (sum === (a ^ b) && carry === (a & b))
        $display("CHECK PASS a=%b b=%b", a, b);
      else
        $display("CHECK FAIL a=%b b=%b: ожидалось sum=%b carry=%b, получено sum=%b carry=%b",
                 a, b, a ^ b, a & b, sum, carry);
    end
  endtask

  initial begin
    for (i = 0; i < 4; i = i + 1) check(i[1:0]);
    $finish;
  end
endmodule
