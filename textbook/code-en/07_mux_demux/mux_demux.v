// Example 7. Decoder, multiplexer and demultiplexer on the board.
// Buttons S1, S2 set the two-bit address s.
//   led[4]   -- output of the 4:1 multiplexer: blinks at the frequency chosen by the address;
//   led[3:0] -- outputs of the 1:4 demultiplexer: the blinking signal goes
//               only to the LED with number s.
module mux_demux (
    input  wire       clk,       // 27 MHz
    input  wire [1:0] btn,       // address s = {S2, S1}
    output wire [5:0] led
);
    // Divider counter: its upper bits are four signals of different frequencies
    reg [24:0] cnt = 0;
    always @(posedge clk) cnt <= cnt + 1'b1;

    wire [3:0] x = cnt[24:21];   // ~0.8 Hz, ~1.6 Hz, ~3.2 Hz, ~6.4 Hz
    wire [1:0] s = btn;

    // 4:1 multiplexer -- two levels of 2:1 multiplexers (a tree)
    wire m0 = s[0] ? x[1] : x[0];
    wire m1 = s[0] ? x[3] : x[2];
    wire y  = s[1] ? m1   : m0;

    // Decoder 2 -> 4: a one on the output with number s
    reg [3:0] dc;
    always @(*) begin
        case (s)
            2'd0:    dc = 4'b0001;
            2'd1:    dc = 4'b0010;
            2'd2:    dc = 4'b0100;
            default: dc = 4'b1000;
        endcase
    end

    // Demultiplexer 1:4 = a decoder whose enable input
    // receives the data signal (here it is the ~1.6 Hz blinking)
    wire       data  = cnt[23];
    wire [3:0] demux = dc & {4{data}};

    // led[5] is not used; inversion -- the LEDs light up from zero
    assign led = ~{1'b0, y, demux};
endmodule
