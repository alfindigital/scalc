// @ts-nocheck
import { useMemo, useState } from "react";
import { Pin } from "lucide-react";
import { n, nShort, fmtPL, fmtTime } from "@/lib/format";
import { XIcon } from "./icons";

function TradeDetail({ trade, onDelete, onRecall }) {
  return (
    <div className="history-detail">
      <div className="hd-section">
        <div className="hd-section-title">Plan Snapshot</div>
        <div className="hd-grid">
          <div className="hd-field"><label>Mode</label><span>{trade.mode === 'position' ? 'Existing' : 'New'}</span></div>
          <div className="hd-field"><label>Bid Awal</label><span>{trade.bids[0]}</span></div>
          <div className="hd-field"><label>Papan</label><span>{trade.bids.length}</span></div>
          <div className="hd-field"><label>Target Tick</label><span>+{trade.targetTicks}</span></div>
          <div className="hd-field"><label>Min Profit</label><span>{trade.targetProfit}%</span></div>
          <div className="hd-field"><label>Total Lot Beli</label><span>{n(trade.planned.totalLot)}</span></div>
          <div className="hd-field"><label>Total Cost</label><span>{nShort(trade.planned.totalCost)}</span></div>
          <div className="hd-field"><label>Avg Final</label><span>{trade.planned.avgFinal.toFixed(2)}</span></div>
          <div className="hd-field"><label>Sell Target</label><span>{trade.planned.sellFinal}</span></div>
          <div className="hd-field"><label>Est. Profit</label><span style={{ color: trade.planned.plFinal >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtPL(trade.planned.plFinal)}</span></div>
        </div>
        {trade.mode === 'position' && trade.existingAvg > 0 && (
          <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-m)' }}>
            Existing: {n(trade.existingLot)} lot @ {trade.existingAvg}
          </div>
        )}
        <div className="hd-mini-table" style={{ marginTop: '14px' }}>
          {trade.bids.map((b, i) => (
            <div key={i}><span>Papan {i + 1}</span><span style={{ color: 'var(--text)', fontWeight: 700 }}>Bid {b}</span></div>
          ))}
        </div>
      </div>

      <div className="hd-section" style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <button className="btn-primary-pyscal" onClick={() => onRecall && onRecall()}
          style={{ padding: '8px 14px' }}>
          ↻ Recall ke Kalkulator
        </button>
        <button className="btn-secondary" onClick={() => { if (confirm(`Hapus trade ini?`)) onDelete(); }}
          style={{ borderColor: 'var(--red)', color: 'var(--red)' }}>
          Hapus Trade
        </button>
      </div>
    </div>
  );
}

export function HistoryModal({ history, viewingId, setViewingId, onClose, onDelete, onRename, onTogglePin, onRecall }) {
  const trade = viewingId ? history.find(t => t.id === viewingId) : null;
  const [query, setQuery] = useState('');
  const [renamingId, setRenamingId] = useState(null);
  const [renameDraft, setRenameDraft] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? history.filter(t => {
          const note = (t.note || '').toLowerCase();
          const avg = String(t.planned?.avgFinal?.toFixed?.(2) ?? '');
          const date = new Date(t.timestamp).toLocaleDateString('id-ID');
          return note.includes(q) || avg.includes(q) || date.toLowerCase().includes(q);
        })
      : history.slice();
    return list.sort((a, b) => {
      const pa = a.pinned ? 1 : 0, pb = b.pinned ? 1 : 0;
      if (pa !== pb) return pb - pa;
      return b.timestamp - a.timestamp;
    });
  }, [history, query]);

  const startRename = (t) => { setRenamingId(t.id); setRenameDraft(t.note || ''); };
  const commitRename = () => {
    if (renamingId) onRename(renamingId, renameDraft);
    setRenamingId(null); setRenameDraft('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-labelledby="history-modal-title">
        <div className="modal-header">
          <div className="modal-title" id="history-modal-title">
            {trade ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button className="modal-close" onClick={() => setViewingId(null)} style={{ padding: '4px' }} aria-label="Kembali ke daftar">←</button>
                {trade.note ? trade.note : `Avg ${trade.planned.avgFinal.toFixed(2)}`}
                <span style={{ fontSize: '12px', color: 'var(--text-m)', fontWeight: 500 }}>{fmtTime(trade.timestamp)}</span>
              </span>
            ) : `History · ${history.length} trade`}
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Tutup"><XIcon /></button>
        </div>
        <div className="modal-body">
          {trade ? (
            <TradeDetail trade={trade} onDelete={() => { onDelete(trade.id); }} onRecall={() => onRecall && onRecall(trade)} />
          ) : history.length === 0 ? (
            <div className="history-empty">
              <div style={{ fontStyle: 'normal', color: 'var(--text)', fontWeight: 600, marginBottom: 4 }}>
                Belum ada trade tersimpan
              </div>
              <div style={{ fontSize: 12 }}>
                Hitung pyramid dulu, lalu klik <strong>tombol bookmark</strong> di header papan
                — atau tekan <kbd style={{ fontFamily: 'JetBrains Mono,monospace', background: 'var(--inp-bg)', border: '1px solid var(--border)', padding: '1px 6px', borderRadius: 3 }}>Ctrl + Shift + S</kbd>
              </div>
            </div>
          ) : (
            <>
              <div className="history-search">
                <input className="sp-input" type="search" inputMode="search"
                  placeholder="Cari nama / avg / tanggal…" value={query}
                  onChange={(e) => setQuery(e.target.value)} aria-label="Cari trade" />
              </div>
              {filtered.length === 0 ? (
                <div className="history-empty">Tidak ada trade cocok "{query}"</div>
              ) : (
                <div className="history-list">
                  {filtered.map(t => {
                    const isRenaming = renamingId === t.id;
                    return (
                      <div key={t.id} className={`history-item${t.pinned ? ' pinned' : ''}`}
                        onClick={() => { if (!isRenaming) setViewingId(t.id); }}>
                        <div className="history-info">
                          <div className="history-avg" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {t.pinned && <Pin size={12} strokeWidth={2.25} aria-label="Ter-pin" style={{ color: 'var(--brand)', fill: 'currentColor' }} />}
                            {isRenaming ? (
                              <input autoFocus className="sp-input"
                                style={{ fontSize: 14, padding: '6px 8px', flex: 1 }}
                                value={renameDraft}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => setRenameDraft(e.target.value)}
                                onBlur={commitRename}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
                                  if (e.key === 'Escape') { e.preventDefault(); setRenamingId(null); setRenameDraft(''); }
                                }}
                                placeholder="Beri nama trade…" maxLength={80} aria-label="Nama trade" />
                            ) : (
                              <span>{t.note ? t.note : `Avg ${t.planned.avgFinal.toFixed(2)}`}</span>
                            )}
                          </div>
                          <div className="history-meta">
                            {t.bids.length} papan · {n(t.planned.totalLot)} lot · {nShort(t.planned.totalCost)} · {t.mode === 'position' ? 'Existing' : 'New'}
                          </div>
                          <div className="history-time">{fmtTime(t.timestamp)}</div>
                        </div>
                        <div className="history-actions" onClick={(e) => e.stopPropagation()}>
                          <button className="history-act" onClick={() => onRecall && onRecall(t)} aria-label="Recall trade">↻</button>
                          <button className="history-act" onClick={() => onTogglePin(t.id)}
                            aria-pressed={!!t.pinned} aria-label={t.pinned ? 'Lepas pin' : 'Pin trade'}>
                            <Pin size={14} strokeWidth={2.25} style={t.pinned ? { fill: 'currentColor' } : undefined} />
                          </button>
                          <button className="history-act"
                            onClick={() => isRenaming ? commitRename() : startRename(t)}
                            aria-label={isRenaming ? 'Simpan nama' : 'Rename trade'}>{isRenaming ? '✓' : '✎'}</button>
                          <button className="history-del" onClick={() => onDelete(t.id)} aria-label="Hapus trade">
                            <XIcon />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default HistoryModal;