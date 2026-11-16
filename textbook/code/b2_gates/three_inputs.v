// Пример 5. Три входа: правило охранной панели, И на три входа, чётность трёх и «2 из 3».
module three_inputs (
    input  door, night, armed,
    output alarm,       // тревога = дверь открыта И (ночь ИЛИ охрана включена)
    output led_n,       // светодиод платы горит от нуля: инверсия тревоги
    output all3,        // И на три входа
    output odd3,        // исключающее ИЛИ трёх: 1, если единиц нечётное число
    output two_of_3     // мажоритарная функция: хотя бы две единицы
);
    assign alarm = door & (night | armed);        // скобки обязательны: & сильнее |
    assign led_n = ~alarm;
    assign all3  = door & night & armed;
    assign odd3  = door ^ night ^ armed;
    assign two_of_3 = (door & night) | (door & armed) | (night & armed);
endmodule
