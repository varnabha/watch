import { useEffect, useRef, useState } from 'react';
import { socket } from '../lib/socket';
import { correction, expected, type State } from '../lib/sync';
import type { Movie } from './Library';
import { Call } from '../lib/webrtc';

export function Room({ movie, back }: { movie: Movie; back: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const [url, setUrl] = useState('');
  const [messages, setMessages] = useState<{ from: string; text: string; at: number }[]>([]);
  const [text, setText] = useState('');
  const [status, setStatus] = useState('Connecting');
  const [members, setMembers] = useState<{ email: string; name: string }[]>([]);

  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [callActive, setCallActive] = useState(false);

  const applying = useRef(false);
  const state = useRef<State | null>(null);
  const callRef = useRef<Call | null>(null);

  useEffect(() => {
    fetch(`/api/movies/${encodeURIComponent(movie.name)}/play-url`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((x) => setUrl(x.url))
      .catch(() => setStatus('Failed to load movie URL'));

    socket.connect();

    socket.emit('room:join', { roomId: 'main' }, (x: any) => {
      if (x.error) {
        setStatus(x.error);
        return;
      }
      state.current = x.state;
      setMessages(x.chat);
      setStatus('Connected');
      socket.emit('player:load', { movie: movie.name });
    });

    socket.on('room:presence', (data: { members: { email: string; name: string }[] }) => {
      if (data?.members) setMembers(data.members);
    });

    socket.on('room:state', (x: { state: State }) => {
      state.current = x.state;
      const v = video.current;
      if (!v) return;
      applying.current = true;
      const target = expected(x.state);
      if (x.state.movie === movie.name && Math.abs(v.currentTime - target) > 0.25)
        v.currentTime = target;
      if (x.state.playing) v.play().catch(() => setStatus('Click play to join playback'));
      else v.pause();
      setTimeout(() => (applying.current = false), 200);
    });

    socket.on('chat:message', (m: any) => setMessages((a) => [...a, m]));

    // WebRTC Signaling
    socket.on('rtc:offer', async (data: { from: string; payload: RTCSessionDescriptionInit }) => {
      if (callRef.current) {
        await callRef.current.handleOffer(data.payload);
      }
    });

    socket.on('rtc:answer', async (data: { from: string; payload: RTCSessionDescriptionInit }) => {
      if (callRef.current) {
        await callRef.current.handleAnswer(data.payload);
      }
    });

    socket.on('rtc:ice', async (data: { from: string; payload: RTCIceCandidateInit }) => {
      if (callRef.current) {
        await callRef.current.handleIce(data.payload);
      }
    });

    return () => {
      callRef.current?.stop();
      socket.disconnect();
      socket.off();
    };
  }, [movie.name]);

  useEffect(() => {
    const id = setInterval(() => {
      const v = video.current,
        s = state.current;
      if (!v || !s || !s.playing) return;
      const c = correction(v.currentTime, expected(s));
      if (c.seek !== undefined) v.currentTime = c.seek;
      v.playbackRate = c.rate;
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const toggleCall = async () => {
    if (callActive) {
      callRef.current?.stop();
      callRef.current = null;
      setCallActive(false);
      setMicOn(false);
      setCamOn(false);
      return;
    }

    try {
      let iceServers: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];
      try {
        const turnRes = await fetch('/api/turn').then((r) => r.json());
        if (turnRes.iceServers) iceServers = turnRes.iceServers;
      } catch (e) {
        console.warn('TURN not configured, using default STUN');
      }

      const call = new Call(
        (name, payload) => socket.emit(name, { payload }),
        (remoteStream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
        }
      );

      await call.start(iceServers);

      if (localVideoRef.current && call.stream) {
        localVideoRef.current.srcObject = call.stream;
      }

      callRef.current = call;
      setCallActive(true);
      setMicOn(true);
      setCamOn(true);
    } catch (e) {
      console.error('Failed to start call', e);
    }
  };

  const toggleMic = () => {
    const next = !micOn;
    setMicOn(next);
    callRef.current?.toggleMic(next);
  };

  const toggleCam = () => {
    const next = !camOn;
    setCamOn(next);
    callRef.current?.toggleCam(next);
  };

  const emit = (n: string) => {
    const v = video.current;
    if (!v || applying.current) return;
    socket.emit(n, { position: v.currentTime });
  };

  return (
    <main className="room">
      <header>
        <button onClick={back}>Library</button>
        <div>
          <span>Status: {status}</span>
          {members.length > 0 && (
            <span style={{ marginLeft: '1rem', color: '#82aaff' }}>
              Online ({members.length}): {members.map((m) => m.name).join(', ')}
            </span>
          )}
        </div>
        <strong>Use headphones to avoid echo.</strong>
      </header>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <video
          ref={video}
          src={url}
          crossOrigin="anonymous"
          controls
          onPlay={() => emit('player:play')}
          onPause={() => emit('player:pause')}
          onSeeked={() => emit('player:seek')}
          onWaiting={() => socket.emit('player:buffering', { isBuffering: true })}
          onCanPlay={() => socket.emit('player:ready')}
        >
          {movie.subtitle && <track kind="subtitles" src={movie.subtitle} default />}
        </video>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button onClick={toggleCall} style={{ background: callActive ? '#e53935' : '#4caf50' }}>
            {callActive ? 'End Video Call' : 'Start Video Call'}
          </button>

          {callActive && (
            <>
              <button
                onClick={toggleMic}
                style={{ background: micOn ? '#2196f3' : '#757575' }}
              >
                {micOn ? 'Mic On 🎤' : 'Mic Off 🔇'}
              </button>

              <button
                onClick={toggleCam}
                style={{ background: camOn ? '#2196f3' : '#757575' }}
              >
                {camOn ? 'Cam On 📹' : 'Cam Off 🚫'}
              </button>
            </>
          )}
        </div>

        {callActive && (
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <div style={{ flex: 1 }}>
              <small>You</small>
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '140px', background: '#000', borderRadius: '4px' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <small>Partner</small>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                style={{ width: '100%', height: '140px', background: '#000', borderRadius: '4px' }}
              />
            </div>
          </div>
        )}
      </section>

      <aside>
        <h2>Chat</h2>
        <div>
          {messages.map((m, i) => (
            <p key={i}>
              <b>{m.from}</b>: {m.text}
            </p>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) socket.emit('chat:message', { text });
            setText('');
          }}
        >
          <input
            maxLength={1000}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
          />
          <button>Send</button>
        </form>
      </aside>
    </main>
  );
}
