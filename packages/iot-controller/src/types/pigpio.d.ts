declare module 'pigpio' {
  export class Gpio {
    static OUTPUT: number
    constructor(pin: number, options: { mode: number })
    digitalWrite(value: number): void
  }
}