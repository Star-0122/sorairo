import qrcode from 'qrcode-generator'

export default function QrCode({ text, size = 190 }: { text: string; size?: number }) {
  const q = qrcode(0, 'M')
  q.addData(text); q.make()
  const n = q.getModuleCount()
  let d = ''
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c + 4} ${r + 4}h1v1h-1z`
  return (
    <div className="qrb" role="img" aria-label="社員番号を含むQRコード">
      <svg viewBox={`0 0 ${n + 8} ${n + 8}`} width={size} height={size} shapeRendering="crispEdges" aria-hidden="true"><rect width="100%" height="100%" fill="#fff" /><path d={d} fill="#111" /></svg>
    </div>
  )
}
