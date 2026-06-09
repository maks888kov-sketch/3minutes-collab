/* Real 1-to-1 WebRTC calling.
 *
 * Media flows peer-to-peer (browser <-> browser); the server only relays tiny
 * signaling messages (invite / offer / answer / ICE) over the realtime socket,
 * so this scales to any number of concurrent calls. The polite/impolite dance
 * is avoided by giving exactly one side (the caller) the job of creating the
 * offer; the callee only ever answers.
 *
 * Lifecycle:
 *   caller: start() -> ring (call-invite) -> on 'ready' -> offer -> answer -> connected
 *   callee: start() -> create pc -> 'ready' -> on 'offer' -> answer -> connected
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';

const DEFAULT_ICE = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
];
const RING_TIMEOUT_MS = 35000;

async function fetchIceServers() {
  try {
    const res = await base44.functions.invoke('getIceServers');
    const list = res?.iceServers;
    if (Array.isArray(list) && list.length) return list;
  } catch {
    // backend unreachable — STUN-only fallback still works on most networks
  }
  return DEFAULT_ICE;
}

/**
 * @param {object}  opts
 * @param {boolean} opts.enabled        run the engine (false for test bots)
 * @param {'caller'|'callee'} opts.role
 * @param {string}  opts.matchId
 * @param {string}  opts.peerProfileId  the other participant's profile id
 * @param {object}  opts.callerInfo     { callerName, callerPhoto, unlimited }
 */
export function useWebRtcCall({ enabled, role, matchId, peerProfileId, callerInfo }) {
  const [status, setStatus] = useState('idle'); // idle|ringing|connecting|connected|ended
  const [endedReason, setEndedReason] = useState(null);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingIce = useRef([]);
  const remoteSet = useRef(false);
  const startedRef = useRef(false);
  const endedRef = useRef(false);
  const connectedRef = useRef(false);
  const offerSentRef = useRef(false);
  const ringTimer = useRef(null);
  const cameraPromiseRef = useRef(null);

  // Latest routing target / payload kept in refs so the signal handler is stable.
  const peerRef = useRef(peerProfileId);
  const matchRef = useRef(matchId);
  const roleRef = useRef(role);
  const callerInfoRef = useRef(callerInfo);
  peerRef.current = peerProfileId;
  matchRef.current = matchId;
  roleRef.current = role;
  callerInfoRef.current = callerInfo;

  const send = useCallback((signal, data) => {
    if (!peerRef.current) return false;
    return base44.sendSignal({ to: peerRef.current, matchId: matchRef.current, signal, data });
  }, []);

  const cleanup = useCallback(() => {
    if (ringTimer.current) {
      clearTimeout(ringTimer.current);
      ringTimer.current = null;
    }
    const pc = pcRef.current;
    if (pc) {
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.onconnectionstatechange = null;
      try { pc.close(); } catch { /* already closed */ }
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    pendingIce.current = [];
    remoteSet.current = false;
  }, []);

  const end = useCallback((reason, notifyPeerSignal) => {
    if (endedRef.current) return;
    endedRef.current = true;
    if (notifyPeerSignal) send(notifyPeerSignal);
    cleanup();
    setRemoteStream(null);
    setEndedReason(reason);
    setStatus('ended');
  }, [cleanup, send]);

  const getCamera = useCallback(() => {
    if (localStreamRef.current) return Promise.resolve(localStreamRef.current);
    if (cameraPromiseRef.current) return cameraPromiseRef.current;
    cameraPromiseRef.current = (async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    })();
    return cameraPromiseRef.current;
  }, []);

  const ensurePc = useCallback((iceServers) => {
    if (pcRef.current) return pcRef.current;
    const pc = new RTCPeerConnection({ iceServers });
    pc.onicecandidate = (e) => {
      if (e.candidate) send('ice', e.candidate.toJSON());
    };
    pc.ontrack = (e) => {
      if (e.streams && e.streams[0]) setRemoteStream(e.streams[0]);
    };
    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      if (st === 'connected') {
        connectedRef.current = true;
        if (!endedRef.current) setStatus('connected');
      } else if (st === 'failed') {
        end('failed', null);
      }
    };
    pcRef.current = pc;
    const stream = localStreamRef.current;
    if (stream) stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    return pc;
  }, [send, end]);

  const drainIce = useCallback(async () => {
    remoteSet.current = true;
    const pc = pcRef.current;
    if (!pc) return;
    const queued = pendingIce.current;
    pendingIce.current = [];
    for (const cand of queued) {
      try { await pc.addIceCandidate(cand); } catch { /* ignore stale candidate */ }
    }
  }, []);

  // Caller: build and send the offer (triggered when the callee signals 'ready').
  const doOffer = useCallback(async () => {
    if (offerSentRef.current || endedRef.current) return;
    offerSentRef.current = true;
    setStatus('connecting');
    const ice = await fetchIceServers();
    const pc = ensurePc(ice);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    send('offer', { type: offer.type, sdp: offer.sdp });
  }, [ensurePc, send]);

  // Callee: accept the offer and answer.
  const handleOffer = useCallback(async (desc) => {
    if (!desc || endedRef.current) return;
    const pc = pcRef.current || ensurePc(await fetchIceServers());
    await pc.setRemoteDescription(new RTCSessionDescription(desc));
    await drainIce();
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    send('answer', { type: answer.type, sdp: answer.sdp });
  }, [ensurePc, drainIce, send]);

  // Caller: remote answer arrived.
  const handleAnswer = useCallback(async (desc) => {
    const pc = pcRef.current;
    if (!pc || !desc || endedRef.current) return;
    if (pc.signalingState === 'stable') return;
    await pc.setRemoteDescription(new RTCSessionDescription(desc));
    await drainIce();
  }, [drainIce]);

  const handleRemoteIce = useCallback(async (cand) => {
    if (!cand) return;
    const pc = pcRef.current;
    if (pc && remoteSet.current) {
      try { await pc.addIceCandidate(cand); } catch { /* ignore */ }
    } else {
      pendingIce.current.push(cand);
    }
  }, []);

  // Single inbound-signal subscription for the whole call.
  useEffect(() => {
    if (!enabled) return undefined;
    const off = base44.onSignal((msg) => {
      if (!msg || msg.match_id !== matchRef.current) return;
      if (peerRef.current && msg.from_profile_id && msg.from_profile_id !== peerRef.current) return;
      const r = roleRef.current;
      switch (msg.signal) {
        case 'call-accept':
          if (r === 'caller' && !connectedRef.current && !endedRef.current) setStatus('connecting');
          break;
        case 'call-reject':
          if (r === 'caller') end('rejected', null);
          break;
        case 'call-busy':
          if (r === 'caller') end('busy', null);
          break;
        case 'ready':
          if (r === 'caller') doOffer();
          break;
        case 'offer':
          if (r === 'callee') handleOffer(msg.data);
          break;
        case 'answer':
          if (r === 'caller') handleAnswer(msg.data);
          break;
        case 'ice':
          handleRemoteIce(msg.data);
          break;
        case 'call-end':
        case 'call-cancel':
          end('peer-left', null);
          break;
        default:
          break;
      }
    });
    return off;
  }, [enabled, doOffer, handleOffer, handleAnswer, handleRemoteIce, end]);

  const start = useCallback(async () => {
    if (startedRef.current || !enabled) return;
    startedRef.current = true;
    endedRef.current = false;
    try {
      await getCamera();
    } catch {
      end('no-camera', null);
      return;
    }
    if (roleRef.current === 'caller') {
      setStatus('ringing');
      send('call-invite', callerInfoRef.current || {});
      ringTimer.current = setTimeout(() => {
        if (!connectedRef.current && !endedRef.current) end('no-answer', 'call-cancel');
      }, RING_TIMEOUT_MS);
    } else {
      setStatus('connecting');
      const ice = await fetchIceServers();
      ensurePc(ice);
      send('ready');
    }
  }, [enabled, getCamera, ensurePc, send, end]);

  const hangup = useCallback(() => end('hangup', 'call-end'), [end]);
  const cancel = useCallback(() => end('cancelled', 'call-cancel'), [end]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    setMuted((prev) => {
      const next = !prev;
      if (stream) stream.getAudioTracks().forEach((t) => { t.enabled = !next; });
      return next;
    });
  }, []);

  const toggleVideo = useCallback(() => {
    const stream = localStreamRef.current;
    setVideoOff((prev) => {
      const next = !prev;
      if (stream) stream.getVideoTracks().forEach((t) => { t.enabled = !next; });
      return next;
    });
  }, []);

  // Tear down on unmount (covers navigating away mid-call). Only notify the peer
  // if a call was actually started, so a caller who backs out of the lobby
  // doesn't emit a stray hang-up.
  useEffect(() => () => {
    if (!endedRef.current && startedRef.current && peerRef.current) {
      endedRef.current = true;
      base44.sendSignal({
        to: peerRef.current,
        matchId: matchRef.current,
        signal: connectedRef.current ? 'call-end' : 'call-cancel',
      });
    }
    cleanup();
  }, [cleanup]);

  return {
    status,
    endedReason,
    muted,
    videoOff,
    localStream,
    remoteStream,
    wasConnected: connectedRef.current,
    prepareCamera: getCamera,
    start,
    hangup,
    cancel,
    toggleMute,
    toggleVideo,
  };
}
