`timescale 1ns/1ps
module tb;
  reg a; wire y;
  wire_demo dut(.a(a), .y(y));
  task check(input v);
    begin
      a = v; #1;
      if (y === v) $display("CHECK PASS a=%b", a);
      else $display("CHECK FAIL при a=%b ожидалось y=%b, получено y=%b", a, v, y);
    end
  endtask
  initial begin check(0); check(1); $finish; end
endmodule
