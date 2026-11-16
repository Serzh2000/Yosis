// Example 8. UART 8N1: transmitter, receiver and a demo module looped back to itself.
// Frame format: start bit (0), 8 data bits least significant first, stop bit (1).

// ---------------------------------------------------------------------------
// Transmitter
// ---------------------------------------------------------------------------
module uart_tx #(
    parameter integer CLKS_PER_BIT = 234        // 27 MHz / 115200 baud
) (
    input            clk,
    input            start,                      // pulse: send the byte data
    input      [7:0] data,
    output reg       tx   = 1'b1,                // the line is 1 when idle
    output           busy
);
    localparam IDLE = 1'b0, SEND = 1'b1;
    reg        state = IDLE;
    reg [15:0] clks  = 0;                        // clock cycles within one bit
    reg [3:0]  idx   = 0;                        // index of the frame bit being sent 0..9
    reg [9:0]  frame = 10'h3FF;                  // {stop, data[7:0], start}

    assign busy = (state == SEND);

    always @(posedge clk) begin
        case (state)
            IDLE: begin
                tx <= 1'b1;
                if (start) begin
                    frame <= {1'b1, data, 1'b0};
                    clks  <= 0;
                    idx   <= 0;
                    state <= SEND;
                end
            end
            SEND: begin
                tx <= frame[idx];                // output the current frame bit
                if (clks == CLKS_PER_BIT - 1) begin
                    clks <= 0;
                    if (idx == 4'd9) state <= IDLE;
                    else             idx <= idx + 4'd1;
                end else begin
                    clks <= clks + 16'd1;
                end
            end
        endcase
    end
endmodule

// ---------------------------------------------------------------------------
// Receiver: waits for the line to fall (start), finds the middle of each bit and reads it
// ---------------------------------------------------------------------------
module uart_rx #(
    parameter integer CLKS_PER_BIT = 234
) (
    input            clk,
    input            rx,
    output reg [7:0] data  = 8'd0,
    output reg       valid = 1'b0                // 1 for one clock cycle when a byte is received
);
    // Pass the asynchronous input through two flip-flops (see the chapter on clocking)
    reg rx_s1 = 1'b1, rx_s = 1'b1;
    always @(posedge clk) begin rx_s1 <= rx; rx_s <= rx_s1; end

    localparam IDLE = 2'd0, START = 2'd1, BITS = 2'd2, STOP = 2'd3;
    reg [1:0]  state = IDLE;
    reg [15:0] clks  = 0;
    reg [2:0]  idx   = 0;
    reg [7:0]  shift = 0;

    always @(posedge clk) begin
        valid <= 1'b0;
        case (state)
            IDLE: if (!rx_s) begin               // the line fell: the start bit began
                clks  <= 0;
                state <= START;
            end
            START: begin                         // wait until the middle of the start bit
                if (clks == (CLKS_PER_BIT >> 1)) begin
                    clks  <= 0;
                    idx   <= 0;
                    state <= rx_s ? IDLE : BITS; // a glitch, not a start: go back
                end else clks <= clks + 16'd1;
            end
            BITS: begin                          // from here on, read exactly once per bit, in its middle
                if (clks == CLKS_PER_BIT - 1) begin
                    clks  <= 0;
                    shift <= {rx_s, shift[7:1]}; // the new bit enters from the top: the least significant bit ends up at the bottom
                    if (idx == 3'd7) state <= STOP;
                    else             idx <= idx + 3'd1;
                end else clks <= clks + 16'd1;
            end
            STOP: begin
                if (clks == CLKS_PER_BIT - 1) begin
                    data  <= shift;
                    valid <= rx_s;               // the stop bit must be a one
                    state <= IDLE;
                end else clks <= clks + 16'd1;
            end
        endcase
    end
endmodule

// ---------------------------------------------------------------------------
// Demo: every 60 clock cycles we send the next letter; the receiver listens to the same line
// ---------------------------------------------------------------------------
module uart_demo #(
    parameter integer CLKS_PER_BIT = 8          // for the board: 234
) (
    input        clk,
    output       tx,
    output [7:0] rx_data,
    output       rx_valid
);
    reg [7:0] letter = "A";
    reg [9:0] wait_cnt = 0;
    reg       start = 1'b0;
    wire      busy;

    uart_tx #(.CLKS_PER_BIT(CLKS_PER_BIT)) u_tx (
        .clk(clk), .start(start), .data(letter), .tx(tx), .busy(busy));
    uart_rx #(.CLKS_PER_BIT(CLKS_PER_BIT)) u_rx (
        .clk(clk), .rx(tx), .data(rx_data), .valid(rx_valid));

    always @(posedge clk) begin
        start <= 1'b0;
        if (!busy && !start) begin
            if (wait_cnt == 10'd20) begin
                wait_cnt <= 0;
                start    <= 1'b1;
            end else wait_cnt <= wait_cnt + 10'd1;
        end
        if (start) letter <= (letter == "Z") ? "A" : letter + 8'd1;
    end
endmodule
