// A guard with night mode: ring if the door is open AND (it is night OR the guard is armed).
module guard_night (
    input  door,    // d: door is open
    input  night,   // n: it is night
    input  armed,   // s: guard is armed
    output alarm
);
    assign alarm = door & (night | armed);   // the brackets repeat the condition word for word
endmodule
