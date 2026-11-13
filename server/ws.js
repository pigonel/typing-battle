// 依存ライブラリなしの最小WebSocketサーバー(RFC 6455。テキストメッセージのみ)
import crypto from 'node:crypto';
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11', MAX_MSG = 4096;

export function upgrade(req, socket, head, onConn) {
  const key = req.headers['sec-websocket-key'];
  if (!key || String(req.headers.upgrade).toLowerCase() !== 'websocket') { socket.destroy(); return; }
  const accept = crypto.createHash('sha1').update(key + GUID).digest('base64');
  socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
  const ws = new Conn(socket);
  onConn(ws, req);
  if (head?.length) ws._data(head);
}

class Conn {
  constructor(socket) {
    Object.assign(this, { socket, buf: Buffer.alloc(0), frag: null, alive: true, closed: false, onmessage: null, onclose: null });
    socket.setNoDelay(true);
    socket.on('data', d => this._data(d));
    socket.on('close', () => this._closed());
    socket.on('error', () => this._closed());
    this.pinger = setInterval(() => { if (!this.alive) return this.terminate(); this.alive = false; this._frame(0x9, Buffer.alloc(0)); }, 20000);
  }
  _data(d) {
    this.alive = true;
    this.buf = Buffer.concat([this.buf, d]);
    for (;;) { const f = this._parse(); if (!f) break; this._handle(f); }
  }
  _parse() {
    const b = this.buf;
    if (b.length < 2) return null;
    const fin = (b[0] & 0x80) !== 0, op = b[0] & 0x0f, masked = (b[1] & 0x80) !== 0;
    let len = b[1] & 0x7f, off = 2;
    if (len === 126) { if (b.length < 4) return null; len = b.readUInt16BE(2); off = 4; }
    else if (len === 127) { if (b.length < 10) return null; if (b.readUInt32BE(2) > 0) { this.terminate(); return null; } len = b.readUInt32BE(6); off = 10; }
    if (len > 1 << 20) { this.terminate(); return null; }
    const need = off + (masked ? 4 : 0) + len;
    if (b.length < need) return null;
    let payload = Buffer.from(b.subarray(off + (masked ? 4 : 0), need));
    if (masked) { const m = b.subarray(off, off + 4); for (let i = 0; i < payload.length; i++) payload[i] ^= m[i & 3]; }
    this.buf = b.subarray(need);
    return { fin, op, payload };
  }
  _handle({ fin, op, payload }) {
    if (op === 0x8) return this.close();
    if (op === 0x9) return this._frame(0xA, payload);
    if (op === 0xA) return;
    if (op === 0x1 || op === 0x0) {
      this.frag = op === 0x1 ? [payload] : this.frag ? [...this.frag, payload] : null;
      if (fin && this.frag) {
        const s = Buffer.concat(this.frag); this.frag = null;
        if (s.length <= MAX_MSG) this.onmessage?.(s.toString('utf8'));
      }
    }
  }
  _frame(op, p) {
    if (this.socket.destroyed) return;
    const n = p.length; let h;
    if (n < 126) h = Buffer.from([0x80 | op, n]);
    else if (n < 65536) { h = Buffer.alloc(4); h[0] = 0x80 | op; h[1] = 126; h.writeUInt16BE(n, 2); }
    else { h = Buffer.alloc(10); h[0] = 0x80 | op; h[1] = 127; h.writeBigUInt64BE(BigInt(n), 2); }
    this.socket.write(Buffer.concat([h, p]));
  }
  send(s) { if (!this.closed) this._frame(0x1, Buffer.from(s)); }
  close() { if (!this.closed) { this._frame(0x8, Buffer.alloc(0)); this.socket.end(); } this._closed(); }
  terminate() { this.socket.destroy(); this._closed(); }
  _closed() { if (this.closed) return; this.closed = true; clearInterval(this.pinger); this.onclose?.(); }
}
