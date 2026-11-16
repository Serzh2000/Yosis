// 16x8 RAM with synchronous write and synchronous read (this is how memory is stored in FPGA blocks).
// A read takes a clock cycle: dout shows the cell contents from BEFORE this edge.
module ram16x8 (
    input            clk,
    input            we,       // 1 = store din at address addr
    input      [3:0] addr,
    input      [7:0] din,
    output reg [7:0] dout
);
    reg [7:0] mem [0:15];
    always @(posedge clk) begin
        if (we) mem[addr] <= din;   // write at the edge
        dout <= mem[addr];          // read at the edge: the word appears in the next cycle
    end
endmodule
