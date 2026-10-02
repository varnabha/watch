export class Call {
  pc?: RTCPeerConnection;
  stream?: MediaStream;
  remoteStream?: MediaStream;

  constructor(
    private signal: (n: string, payload: unknown) => void,
    private onRemoteStream?: (stream: MediaStream) => void
  ) {}

  async start(servers: RTCIceServer[]) {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, frameRate: 15 },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (e) {
      console.warn('Could not acquire audio/video stream', e);
    }

    this.pc = new RTCPeerConnection({ iceServers: servers });

    this.remoteStream = new MediaStream();
    this.pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => {
        this.remoteStream?.addTrack(track);
      });
      if (this.onRemoteStream && this.remoteStream) {
        this.onRemoteStream(this.remoteStream);
      }
    };

    if (this.stream) {
      this.stream.getTracks().forEach((t) => this.pc!.addTrack(t, this.stream!));
    }

    this.pc.onicecandidate = (e) => e.candidate && this.signal('rtc:ice', e.candidate);
    this.pc.onnegotiationneeded = async () => {
      try {
        await this.pc!.setLocalDescription();
        this.signal('rtc:offer', this.pc!.localDescription);
      } catch (err) {
        console.error('Error during RTC negotiation', err);
      }
    };
  }

  toggleMic(enabled: boolean) {
    this.stream?.getAudioTracks().forEach((track) => (track.enabled = enabled));
  }

  toggleCam(enabled: boolean) {
    this.stream?.getVideoTracks().forEach((track) => (track.enabled = enabled));
  }

  async handleOffer(offer: RTCSessionDescriptionInit) {
    if (!this.pc) return;
    await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    this.signal('rtc:answer', answer);
  }

  async handleAnswer(answer: RTCSessionDescriptionInit) {
    if (!this.pc) return;
    await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
  }

  async handleIce(candidate: RTCIceCandidateInit) {
    if (!this.pc) return;
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.error('Error adding ICE candidate', e);
    }
  }

  stop() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.pc?.close();
  }
}
