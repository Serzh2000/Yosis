// Sample answer for the "ROM + address counter" task: an 8x7 ROM holds the segment codes of the digits 0..7,
// an address counter steps through all 8 words cyclically, one per clock cycle.
module seg_scan (
    input        clk,
    output [6:0] seg        // segments g f e d c b a
);
    reg [2:0] addr = 3'd0;               // address counter 0..7
    reg [6:0] rom [0:7];                 // 8x7 ROM
    initial begin
        rom[0] = 7'h3F; rom[1] = 7'h06; rom[2] = 7'h5B; rom[3] = 7'h4F;
        rom[4] = 7'h66; rom[5] = 7'h6D; rom[6] = 7'h7D; rom[7] = 7'h07;
    end
    always @(posedge clk) addr <= addr + 3'd1;   // after 7 it is 0 again
    assign seg = rom[addr];
endmodule
