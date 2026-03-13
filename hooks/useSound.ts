"use client";

import { useCallback, useEffect, useRef } from "react";

// ─── Persistent Audio Context (shared across hook instances) ───

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
}

// ─── Synthesizer Primitives ───

function noise(ctx: AudioContext, duration: number, gain: number): AudioBufferSourceNode {
    const buf = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * gain;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    return src;
}

function tone(ctx: AudioContext, freq: number, type: OscillatorType = "sine"): OscillatorNode {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    return osc;
}

function env(ctx: AudioContext, attack: number, decay: number, sustain: number, release: number, peak = 1): GainNode {
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.linearRampToValueAtTime(sustain * peak, t + attack + decay);
    g.gain.linearRampToValueAtTime(0, t + attack + decay + release);
    return g;
}

function lowpass(ctx: AudioContext, freq: number): BiquadFilterNode {
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = freq;
    return f;
}

function highpass(ctx: AudioContext, freq: number): BiquadFilterNode {
    const f = ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = freq;
    return f;
}

// ─── Sound Definitions ───

const sounds = {
    // Dice: shaker rattle
    diceRoll() {
        const ctx = getCtx();
        const dur = 0.35 + Math.random() * 0.15;
        const src = noise(ctx, dur, 0.8);
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = 3000 + Math.random() * 2000;
        bp.Q.value = 1.5;
        const e = env(ctx, 0.01, 0.05, 0.6, dur - 0.1, 0.35);
        src.connect(bp).connect(e).connect(ctx.destination);
        src.start();
        src.stop(ctx.currentTime + dur);
    },

    // Building: solid thud + tap
    roadPlace() {
        const ctx = getCtx();
        const o = tone(ctx, 180, "triangle");
        const e = env(ctx, 0.005, 0.06, 0.1, 0.1, 0.3);
        o.connect(e).connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + 0.2);
    },

    settlementPlace() {
        const ctx = getCtx();
        const o = tone(ctx, 260, "triangle");
        const e = env(ctx, 0.005, 0.08, 0.2, 0.15, 0.3);
        const n = noise(ctx, 0.08, 0.3);
        const ne = env(ctx, 0.005, 0.03, 0.1, 0.04, 0.15);
        const hp = highpass(ctx, 2000);
        o.connect(e).connect(ctx.destination);
        n.connect(hp).connect(ne).connect(ctx.destination);
        o.start(); n.start();
        o.stop(ctx.currentTime + 0.3);
        n.stop(ctx.currentTime + 0.1);
    },

    cityPlace() {
        const ctx = getCtx();
        // Deep thud
        const o1 = tone(ctx, 200, "triangle");
        const e1 = env(ctx, 0.005, 0.08, 0.15, 0.15, 0.35);
        o1.connect(e1).connect(ctx.destination);
        o1.start(); o1.stop(ctx.currentTime + 0.3);
        // Higher chime
        setTimeout(() => {
            const o2 = tone(ctx, 520, "sine");
            const e2 = env(ctx, 0.005, 0.1, 0.3, 0.3, 0.2);
            o2.connect(e2).connect(ctx.destination);
            o2.start(); o2.stop(ctx.currentTime + 0.5);
        }, 80);
    },

    // Robber: low menacing
    robberPlace() {
        const ctx = getCtx();
        const o = tone(ctx, 90, "sawtooth");
        const lp = lowpass(ctx, 400);
        const e = env(ctx, 0.02, 0.15, 0.3, 0.25, 0.3);
        o.connect(lp).connect(e).connect(ctx.destination);
        o.start();
        o.frequency.linearRampToValueAtTime(60, ctx.currentTime + 0.4);
        o.stop(ctx.currentTime + 0.5);
    },

    // Trade completed: coin clink
    tradeAccepted() {
        const ctx = getCtx();
        [800, 1100, 1400].forEach((f, i) => {
            setTimeout(() => {
                const o = tone(ctx, f, "sine");
                const e = env(ctx, 0.002, 0.04, 0.15, 0.12, 0.15);
                o.connect(e).connect(ctx.destination);
                o.start(); o.stop(ctx.currentTime + 0.2);
            }, i * 50);
        });
    },

    // Trade offer: gentle ping
    tradeOffer() {
        const ctx = getCtx();
        const o = tone(ctx, 660, "sine");
        const e = env(ctx, 0.005, 0.08, 0.2, 0.15, 0.15);
        o.connect(e).connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + 0.3);
    },

    // Trade rejected: low buzz
    tradeRejected() {
        const ctx = getCtx();
        const o = tone(ctx, 180, "square");
        const lp = lowpass(ctx, 600);
        const e = env(ctx, 0.01, 0.05, 0.4, 0.1, 0.12);
        o.connect(lp).connect(e).connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + 0.2);
    },

    // Dev card bought: card slide
    devCardBought() {
        const ctx = getCtx();
        const n = noise(ctx, 0.15, 0.5);
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass"; bp.frequency.value = 4000; bp.Q.value = 0.8;
        const e = env(ctx, 0.01, 0.05, 0.3, 0.08, 0.2);
        n.connect(bp).connect(e).connect(ctx.destination);
        n.start(); n.stop(ctx.currentTime + 0.2);
    },

    // Dev card played: dramatic whoosh
    devCardPlayed() {
        const ctx = getCtx();
        const n = noise(ctx, 0.3, 0.6);
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass"; bp.frequency.value = 1500; bp.Q.value = 0.5;
        bp.frequency.linearRampToValueAtTime(4000, ctx.currentTime + 0.3);
        const e = env(ctx, 0.01, 0.1, 0.4, 0.15, 0.2);
        n.connect(bp).connect(e).connect(ctx.destination);
        n.start(); n.stop(ctx.currentTime + 0.35);
    },

    // Monopoly: dramatic sweep
    monopoly() {
        const ctx = getCtx();
        const o = tone(ctx, 300, "sawtooth");
        o.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.3);
        const lp = lowpass(ctx, 1200);
        const e = env(ctx, 0.01, 0.1, 0.5, 0.2, 0.25);
        o.connect(lp).connect(e).connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + 0.5);
    },

    // Discard notification: warning ding
    discardNotify() {
        const ctx = getCtx();
        [440, 440].forEach((f, i) => {
            setTimeout(() => {
                const o = tone(ctx, f, "sine");
                const e = env(ctx, 0.005, 0.06, 0.1, 0.1, 0.2);
                o.connect(e).connect(ctx.destination);
                o.start(); o.stop(ctx.currentTime + 0.2);
            }, i * 150);
        });
    },

    // Your turn: bright alert chime
    yourTurn() {
        const ctx = getCtx();
        [523, 659, 784].forEach((f, i) => {
            setTimeout(() => {
                const o = tone(ctx, f, "sine");
                const e = env(ctx, 0.005, 0.1, 0.2, 0.2, 0.2);
                o.connect(e).connect(ctx.destination);
                o.start(); o.stop(ctx.currentTime + 0.35);
            }, i * 100);
        });
    },

    // Achievement: longest road / largest army fanfare
    achievement() {
        const ctx = getCtx();
        [523, 659, 784, 1047].forEach((f, i) => {
            setTimeout(() => {
                const o = tone(ctx, f, "sine");
                const e = env(ctx, 0.01, 0.12, 0.3, 0.25, 0.2);
                o.connect(e).connect(ctx.destination);
                o.start(); o.stop(ctx.currentTime + 0.45);
            }, i * 120);
        });
    },

    // Victory: triumphant fanfare
    victory() {
        const ctx = getCtx();
        [523, 659, 784, 1047, 1319].forEach((f, i) => {
            setTimeout(() => {
                const o = tone(ctx, f, "triangle");
                const e = env(ctx, 0.01, 0.15, 0.4, 0.4, 0.25);
                o.connect(e).connect(ctx.destination);
                o.start(); o.stop(ctx.currentTime + 0.6);
            }, i * 150);
        });
    },

    // Game started: bold start
    gameStarted() {
        const ctx = getCtx();
        const o = tone(ctx, 330, "triangle");
        const e = env(ctx, 0.01, 0.1, 0.3, 0.3, 0.25);
        o.connect(e).connect(ctx.destination);
        o.start();
        o.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.3);
        o.stop(ctx.currentTime + 0.5);
    },

    // Lobby join: soft pop
    joinRoom() {
        const ctx = getCtx();
        const o = tone(ctx, 600, "sine");
        const e = env(ctx, 0.005, 0.06, 0.1, 0.08, 0.18);
        o.connect(e).connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + 0.18);
    },

    // Lobby leave: descending pop
    leaveRoom() {
        const ctx = getCtx();
        const o = tone(ctx, 500, "sine");
        o.frequency.linearRampToValueAtTime(300, ctx.currentTime + 0.15);
        const e = env(ctx, 0.005, 0.06, 0.1, 0.08, 0.15);
        o.connect(e).connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + 0.2);
    },

    // Setting changed: subtle click
    settingChanged() {
        const ctx = getCtx();
        const o = tone(ctx, 1000, "sine");
        const e = env(ctx, 0.002, 0.02, 0.05, 0.03, 0.1);
        o.connect(e).connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + 0.08);
    },

    // Player disconnect: low tone
    disconnect() {
        const ctx = getCtx();
        const o = tone(ctx, 300, "sine");
        o.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.3);
        const e = env(ctx, 0.01, 0.1, 0.2, 0.15, 0.15);
        o.connect(e).connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + 0.35);
    },

    // Player reconnect: ascending tone
    reconnect() {
        const ctx = getCtx();
        const o = tone(ctx, 300, "sine");
        o.frequency.linearRampToValueAtTime(500, ctx.currentTime + 0.2);
        const e = env(ctx, 0.01, 0.1, 0.2, 0.15, 0.15);
        o.connect(e).connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + 0.35);
    },

    // Chat message: quick blip
    chatMessage() {
        const ctx = getCtx();
        const o = tone(ctx, 900, "sine");
        const e = env(ctx, 0.002, 0.03, 0.05, 0.04, 0.08);
        o.connect(e).connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + 0.1);
    },

    // UI click
    click() {
        const ctx = getCtx();
        const o = tone(ctx, 800, "sine");
        const e = env(ctx, 0.001, 0.015, 0.02, 0.02, 0.08);
        o.connect(e).connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + 0.06);
    },
};

export type SoundName = keyof typeof sounds;

// ─── Hook ───

export function useSound() {
    const muted = useRef(false);
    const volume = useRef(0.7);

    // Load preferences from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem("catan_sound_muted");
            if (saved === "true") muted.current = true;
            const savedVol = localStorage.getItem("catan_sound_volume");
            if (savedVol) volume.current = parseFloat(savedVol);
        } catch { /* noop */ }
    }, []);

    const play = useCallback((name: SoundName) => {
        if (muted.current) return;
        try {
            const ctx = getCtx();
            // Set master volume
            if (ctx.destination.channelCount > 0) {
                // We handle volume per-sound via gain nodes; for simplicity apply via context gain
            }
            sounds[name]();
        } catch { /* AudioContext may not be available */ }
    }, []);

    const setMuted = useCallback((m: boolean) => {
        muted.current = m;
        try { localStorage.setItem("catan_sound_muted", String(m)); } catch { /* noop */ }
    }, []);

    const toggleMute = useCallback(() => {
        setMuted(!muted.current);
        return !muted.current;
    }, [setMuted]);

    const isMuted = useCallback(() => muted.current, []);

    return { play, setMuted, toggleMute, isMuted };
}
