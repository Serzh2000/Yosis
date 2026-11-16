// Example 3. Converting a binary number 0..255 to three BCD digits (the "shift and add 3" algorithm).
module bin2bcd (
    input  [7:0] bin,       // binary number
    output reg [3:0] h,     // hundreds
    output reg [3:0] t,     // tens
    output reg [3:0] o      // ones
);
    integer i;
    reg [19:0] sh;          // {hundreds, tens, ones, original number}
    always @(*) begin
        sh = 20'd0;
        sh[7:0] = bin;
        for (i = 0; i < 8; i = i + 1) begin
            // before the shift every digit 5..9 gets +3: after the shift this is the correction of 6
            if (sh[11:8]  >= 4'd5) sh[11:8]  = sh[11:8]  + 4'd3;
            if (sh[15:12] >= 4'd5) sh[15:12] = sh[15:12] + 4'd3;
            if (sh[19:16] >= 4'd5) sh[19:16] = sh[19:16] + 4'd3;
            sh = sh << 1;
        end
        h = sh[19:16];
        t = sh[15:12];
        o = sh[11:8];
    end
endmodule
