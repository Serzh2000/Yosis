// "Exactly two of three": the model answer to the "change the condition" task.
module exactly2 (
    input  a, b, c,
    output y
);
    assign y = ({1'b0, a} + {1'b0, b} + {1'b0, c}) == 2'd2;   // count the ones and compare with two
endmodule
