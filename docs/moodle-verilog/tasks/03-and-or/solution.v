module gates2(input a, input b, output y_and, output y_or);
  assign y_and = a & b;
  assign y_or  = a | b;
endmodule
