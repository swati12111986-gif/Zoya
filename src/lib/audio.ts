
export class AudioStreamer {
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private stream: MediaStream | null = null;
  private onAudioData: (base64: string, volume: number) => void;

  constructor(onAudioData: (base64: string, volume: number) => void) {
    this.onAudioData = onAudioData;
  }

  async start() {
    this.audioContext = new AudioContext({ sampleRate: 16000 });
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!this.audioContext) return;
      const source = this.audioContext.createMediaStreamSource(this.stream);
      
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      this.processor.onaudioprocess = (e) => {
        if (!this.audioContext) return;
        const inputData = e.inputBuffer.getChannelData(0);
        
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const volume = Math.sqrt(sum / inputData.length);

        const pcm16 = this.floatToPcm16(inputData);
        const base64 = this.arrayBufferToBase64(pcm16.buffer);
        this.onAudioData(base64, volume);
      };
    } catch (e: any) {
      this.audioContext?.close().catch(() => {});
      this.audioContext = null;
      if (e.name === 'NotAllowedError') {
        throw new Error('Neural-mic link rejected by user. Please enable permissions.');
      } else if (e.name === 'NotFoundError') {
        throw new Error('No compatible neural-mic detected on this system.');
      }
      throw e;
    }
  }

  stop() {
    this.stream?.getTracks().forEach(t => t.stop());
    this.processor?.disconnect();
    const ctx = this.audioContext;
    this.audioContext = null;
    if (ctx && ctx.state !== 'closed') {
      ctx.close().catch(e => console.error("Error closing AudioStreamer context:", e));
    }
  }

  private floatToPcm16(float32Array: Float32Array): Int16Array {
    const pcm16 = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
        const s = Math.max(-1, Math.min(1, float32Array[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return pcm16;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private nextStartTime: number = 0;

  constructor(sampleRate: number = 24000) {
    this.audioContext = new AudioContext({ sampleRate });
  }

  async playChunk(base64: string) {
    if (!this.audioContext) return;

    const arrayBuffer = this.base64ToArrayBuffer(base64);
    const float32Data = this.pcm16ToFloat32(new Int16Array(arrayBuffer));
    
    const audioBuffer = this.audioContext.createBuffer(1, float32Data.length, this.audioContext.sampleRate);
    audioBuffer.getChannelData(0).set(float32Data);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    const startTime = Math.max(this.audioContext.currentTime, this.nextStartTime);
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    source.start(startTime);
    this.nextStartTime = startTime + audioBuffer.duration;
  }

  stop() {
    const ctx = this.audioContext;
    this.audioContext = null;
    if (ctx && ctx.state !== 'closed') {
      ctx.close().catch(e => console.error("Error closing AudioPlayer context:", e));
    }
    this.audioContext = new AudioContext({ sampleRate: 24000 });
    this.nextStartTime = 0;
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const buffer = new ArrayBuffer(binary.length);
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return buffer;
  }

  private pcm16ToFloat32(pcm16: Int16Array): Float32Array {
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 0x8000;
    }
    return float32;
  }
}
