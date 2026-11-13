`timescale 1ns/1ps
module tb;
  reg a, b; wire y_and, y_or;
  integer i;
  gates2 dut(.a(a), .b(b), .y_and(y_and), .y_or(y_or));
  task check(input [1:0] n);
    begin
      {a, b} = n; #1;
      if (y_and === (a & b)) $display("CHECK PASS И a=%b b=%b", a, b);
      else $display("CHECK FAIL И: при a=%b b=%b ожидалось y_and=%b, получено %b", a, b, a & b, y_and);
      if (y_or === (a | b)) $display("CHECK PASS ИЛИ a=%b b=%b", a, b);
      else $display("CHECK FAIL ИЛИ: при a=%b b=%b ожидалось y_or=%b, получено %b", a, b, a | b, y_or);
    end
  endtask
  initial begin for (i = 0; i < 4; i = i + 1) check(i[1:0]); $finish; end
endmodule
