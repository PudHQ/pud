export function startAudio(current?: AudioContext) {
  try {
    const context = current ?? new AudioContext();
    if (context.state !== "running") void context.resume().catch(() => {});
    return context;
  } catch {
    return undefined;
  }
}

export function playKey(ctx: AudioContext, midi: number) {
  const t = ctx.currentTime;
  const frequency = 440 * 2 ** ((midi - 69) / 12);
  const output = ctx.createGain();
  output.connect(ctx.destination);
  output.gain.setValueAtTime(0.001, t);
  output.gain.exponentialRampToValueAtTime(0.12, t + 0.011);
  output.gain.exponentialRampToValueAtTime(0.055, t + 0.2);
  const voices = [1, 2, 3].map((ratio, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency * ratio;
    gain.gain.setValueAtTime([1, 0.38, 0.21][i], t);
    if (i) gain.gain.exponentialRampToValueAtTime(0.018, t + 0.45 + i * 0.07);
    osc.connect(gain).connect(output);
    osc.start(t);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
      if (!i) output.disconnect();
    };
    return osc;
  });
  return () => {
    const release = ctx.currentTime;
    if (typeof output.gain.cancelAndHoldAtTime === "function") output.gain.cancelAndHoldAtTime(release);
    else {
      output.gain.cancelScheduledValues(release);
      output.gain.setValueAtTime(output.gain.value, release);
    }
    output.gain.setTargetAtTime(0.0001, release, 0.042);
    for (const osc of voices) osc.stop(release + 0.26);
  };
}

const grooveDuration = 3.6;

export function cutGroove(ctx: AudioContext) {
  const rate = 22050;
  const front = ctx.createBuffer(1, grooveDuration * rate, rate);
  const back = ctx.createBuffer(1, front.length, rate);
  const samples = front.getChannelData(0);
  const reverse = back.getChannelData(0);
  let noise = 71;
  let last = 0;
  for (let i = 0; i < samples.length; i++) {
    const t = i / rate;
    const beat = (t / grooveDuration) * 8;
    const count = Math.floor(beat);
    const sub = ((beat - count) * grooveDuration) / 8;
    const hat = (((beat * 2) % 1) * grooveDuration) / 16;
    noise = (1664525 * noise + 1013904223) >>> 0;
    const random = noise / 2147483648 - 1;
    const kick = Math.sin(2 * Math.PI * (46 * sub + 2 * (1 - Math.exp(-32 * sub)))) * Math.exp(-19 * sub);
    const bass = [82.41, 82.41, 98, 110, 82.41, 123.47, 98, 73.42][count];
    const note = Math.sin(2 * Math.PI * bass * sub) * Math.exp(-10 * sub);
    const metal = (random - last) * Math.exp(-84 * hat);
    samples[i] = 0.48 * kick + 0.27 * note + 0.095 * metal;
    reverse[samples.length - 1 - i] = samples[i];
    last = random;
  }
  return { front, back };
}

export function readGroove(
  ctx: AudioContext,
  groove: ReturnType<typeof cutGroove>,
  turns: number,
  radiansPerSecond: number,
) {
  if (Math.abs(radiansPerSecond) < 0.08 || ctx.state !== "running") return;
  const now = ctx.currentTime;
  const source = ctx.createBufferSource();
  source.buffer = radiansPerSecond < 0 ? groove.back : groove.front;
  source.loop = true;
  source.playbackRate.value = Math.min(
    5,
    Math.max(0.04, (Math.abs(radiansPerSecond) * grooveDuration) / (Math.PI * 2)),
  );
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.33, now + 0.021);
  gain.gain.linearRampToValueAtTime(0.001, now + 0.095);
  const phase = (((turns * Math.sign(radiansPerSecond)) % 1) + 1) % 1;
  source.connect(gain).connect(ctx.destination);
  source.start(now, phase * grooveDuration);
  source.stop(now + 0.1);
  source.onended = () => {
    source.disconnect();
    gain.disconnect();
  };
}
