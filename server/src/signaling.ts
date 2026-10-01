/** Signaling payloads are deliberately opaque: SDP/ICE are relayed only inside main. */
export type SignalName='rtc:offer'|'rtc:answer'|'rtc:ice';
export const signalNames:SignalName[]=['rtc:offer','rtc:answer','rtc:ice'];
