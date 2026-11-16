// Охрана с ночным режимом: звонить, если дверь открыта И (ночь ИЛИ включена охрана).
module guard_night (
    input  door,    // d: дверь открыта
    input  night,   // n: сейчас ночь
    input  armed,   // s: охрана включена
    output alarm
);
    assign alarm = door & (night | armed);   // скобки повторяют условие слово в слово
endmodule
