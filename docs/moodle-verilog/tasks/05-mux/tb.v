`timescale 1ns/1ps
module tb;
  reg a, b, sel; wire y;
  integer i;
  mux2 dut(.a(a), .b(b), .sel(sel), .y(y));
  task check(input [2:0] n);
    reg exp;
    begin
      {sel, a, b} = n; #1;
      exp = sel ? b : a;
      if (y === exp) $display("CHECK PASS sel=%b a=%b b=%b", sel, a, b);
      else $display("CHECK FAIL при sel=%b a=%b b=%b ожидалось y=%b, получено %b", sel, a, b, exp, y);
    end
  endtask
  initial begin for (i = 0; i < 8; i = i + 1) check(i[2:0]); $finish; end
endmodule
