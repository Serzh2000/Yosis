// The face of the bench oscilloscope, drawn after Soviet bench instruments (С1-65, С1-94): a
// grey-blue case, a CRT in a black bezel on the left, a block of knobs with white pointers on
// the right, legends in Russian and the three inputs under the screen. Positions come from
// scope-layout.ts so that the painted legends line up with the 3D knobs and sockets.
import * as THREE from 'three';
import { KNOBS, PANEL, SCREEN, SOCKETS, SWEEP } from './scope-layout';
import { canvasTexture } from './textures';

/** The static front plate: paint, legends, screen bezel. The screen itself is a separate plane. */
export function scopePanelTexture() {
  const scale = 16,
    { context: g, texture } = canvasTexture(PANEL.w * scale, PANEL.h * scale),
    mm = (value: number) => value * scale,
    ink = '#20282a',
    font = (size: number, weight = 700) =>
      `${weight} ${mm(size)}px 'Rubik Variable', 'Segoe UI', sans-serif`;
  g.fillStyle = '#cfd5cc';
  g.fillRect(0, 0, mm(PANEL.w), mm(PANEL.h));
  // Fine paint speckle, as on a stove-enamelled front plate.
  for (let i = 0; i < 1600; i++) {
    g.fillStyle = i % 2 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
    g.fillRect(Math.random() * mm(PANEL.w), Math.random() * mm(PANEL.h), 3, 3);
  }
  // Black bezel around the CRT with a recessed inner edge.
  g.fillStyle = '#15191a';
  g.beginPath();
  g.roundRect(mm(SCREEN.x - 2), mm(SCREEN.y - 2), mm(SCREEN.w + 4), mm(SCREEN.h + 4), mm(2.2));
  g.fill();
  g.strokeStyle = '#3a4244';
  g.lineWidth = 3;
  g.stroke();
  g.fillStyle = '#10130f';
  g.fillRect(mm(SCREEN.x), mm(SCREEN.y), mm(SCREEN.w), mm(SCREEN.h));

  g.fillStyle = ink;
  g.strokeStyle = ink;
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  g.font = font(1.3);
  for (const knob of KNOBS) {
    // A scale of ticks over the top of the knob, and its legend above that.
    g.lineWidth = 2;
    const inner = knob.radius + 1.5,
      outer = knob.radius + 2.3,
      first = -SWEEP,
      ticks = knob.dial.options ? knob.dial.options.length : 9;
    for (let tick = 0; tick < ticks; tick++) {
      const angle = ((first + (tick / Math.max(1, ticks - 1)) * SWEEP * 2) * Math.PI) / 180,
        dx = Math.sin(angle),
        dy = -Math.cos(angle);
      g.beginPath();
      g.moveTo(mm(knob.x + dx * inner), mm(knob.y + dy * inner));
      g.lineTo(mm(knob.x + dx * outer), mm(knob.y + dy * outer));
      g.stroke();
    }
    g.fillText(knob.label, mm(knob.x), mm(knob.y - outer - 1));
  }
  for (const socket of SOCKETS) {
    g.lineWidth = 3;
    g.beginPath();
    g.roundRect(mm(socket.x - 4.2), mm(socket.y - 4.6), mm(8.4), mm(9.2), mm(1));
    g.stroke();
    g.fillText(socket.label, mm(socket.x), mm(socket.y - 5.9));
  }
  // Model plate bottom left, maker's mark bottom right, the pilot lamp beside the screen.
  g.textAlign = 'left';
  g.font = font(2.7, 800);
  g.fillText('С1-94', mm(4), mm(38));
  g.font = font(1.15, 600);
  g.fillText('ОСЦИЛЛОГРАФ', mm(4), mm(40.6));
  g.beginPath();
  g.moveTo(mm(4), mm(41.6));
  g.lineTo(mm(17), mm(41.6));
  g.lineWidth = 2;
  g.stroke();
  g.textAlign = 'right';
  g.fillText('СДЕЛАНО В СССР', mm(PANEL.w - 4), mm(50));
  g.fillStyle = '#b53a2c';
  g.beginPath();
  g.arc(mm(53), mm(34), mm(0.9), 0, Math.PI * 2);
  g.fill();
  texture.needsUpdate = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
