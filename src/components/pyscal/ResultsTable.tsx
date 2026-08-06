// @ts-nocheck
import { n, nShort, fmtPL, fmtPct } from "@/lib/format";
import { validateBid } from "@/lib/validation";
import { XIcon } from "./icons";
import { BidStepInput, LotInput, SwipeableCard, handleGridNavKey } from "./internals";

export function ResultsTable({
  results,
  bidRiseWarnings,
  targetProfit,
  totalLot,
  totalCost,
  balance,
  setBidAt,
  setLotAt,
  customLot,
  removePapan,
  bidsCount,
}) {
  const layerIndex = (r, idx) => (r.isExisting ? -1 : idx - (results[0]?.isExisting ? 1 : 0));

  return (
    <>
      {/* Desktop */}
      <div className="dt">
        <table>
          <thead>
            <tr>
              {["#", "Bid", "Lot", "Avg", "Sell", "Cost", "Profit", "%", ""].map((h, i) => (
                <th key={i}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => {
              const li = layerIndex(r, i);
              const isWarn = !r.isExisting && bidRiseWarnings.includes(li + 1);
              const isUnder = !r.isExisting && r.pct < targetProfit - 0.001;
              const bidErr = !r.isExisting ? validateBid(Number(r.bid)).error : "";
              return (
                <tr
                  key={i}
                  className={r.isExisting ? "row-existing" : isUnder ? "row-under" : ""}
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <td>{r.layer}</td>
                  <td className="c-bid">
                    {r.isExisting ? (
                      <span className="c-bid-static">{r.bid}</span>
                    ) : (
                      <BidStepInput
                        className={`bid-edit ${isWarn ? "bid-edit-w" : ""} ${bidErr ? "bid-edit-e" : ""}`}
                        value={r.bid}
                        onChange={(v) => setBidAt(li, v)}
                        label={`Bid papan ${r.layer}`}
                        error={bidErr || ""}
                        warning={
                          isWarn
                            ? `Bid papan ${r.layer} tidak lebih rendah dari papan sebelumnya, bukan averaging down.`
                            : ""
                        }
                        gridRow={li}
                        gridCol="bid"
                      />
                    )}
                  </td>
                  <td className="c-lot">
                    {customLot && !r.isExisting ? (
                      <LotInput
                        className="lot-edit"
                        value={r.lot}
                        onChange={(v) => setLotAt(li, v)}
                        label={`Lot papan ${r.layer}`}
                        gridRow={li}
                        gridCol="lot"
                        onKeyDown={(e) => handleGridNavKey(e, li, "lot")}
                      />
                    ) : (
                      n(r.lot)
                    )}
                  </td>
                  <td className="c-avg">{r.avg.toFixed(2)}</td>
                  <td className="c-sell">{r.sell}</td>
                  <td className="c-cost">{n(r.cost)}</td>
                  <td className={r.pl >= 0 ? "c-plp" : "c-pln"}>{fmtPL(r.pl)}</td>
                  <td>
                    <span className={`pp ${isUnder ? "pp-u" : r.pct >= 0 ? "pp-g" : "pp-r"}`}>
                      {isUnder && <span className="pp-icon">⚠</span>}
                      {fmtPct(r.pct)}
                    </span>
                  </td>
                  <td>
                    {!r.isExisting && li > 0 && (
                      <button
                        className="row-x"
                        onClick={() => removePapan(li)}
                        aria-label={`Hapus papan ${r.layer}`}
                        title={`Hapus papan ${r.layer}`}
                      >
                        <XIcon />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            <tr className="total-row">
              <td className="total-label">Total Beli</td>
              <td></td>
              <td className="c-lot">{n(totalLot)}</td>
              <td></td>
              <td></td>
              <td style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {nShort(totalCost)}
                {balance > 0 && (
                  <span className="util"> ({Math.round((totalCost / balance) * 100)}%)</span>
                )}
              </td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="mc">
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "12px" }}>
          {results.map((r, i) => {
            const li = layerIndex(r, i);
            const isUnder = !r.isExisting && r.pct < targetProfit - 0.001;
            const isWarn = !r.isExisting && bidRiseWarnings.includes(li + 1);
            const bidErr = !r.isExisting ? validateBid(Number(r.bid)).error : "";
            const canSwipe = !r.isExisting && li > 0;
            return (
              <SwipeableCard
                key={i}
                canSwipe={canSwipe}
                onDelete={() => removePapan(li)}
                className={`mk ${r.isExisting ? "mk-existing" : isUnder ? "mk-under" : ""}`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {!r.isExisting && li > 0 && (
                  <button
                    className="m-remove"
                    onClick={() => removePapan(li)}
                    aria-label={`Hapus papan ${r.layer}`}
                    title={`Hapus papan ${r.layer}`}
                  >
                    <XIcon />
                  </button>
                )}
                <div className="mh">
                  <div className="mhi">
                    <label>Bid</label>
                    {r.isExisting ? (
                      <span>{r.bid}</span>
                    ) : (
                      <BidStepInput
                        className="mhi-inp"
                        variant="mobile"
                        value={r.bid}
                        onChange={(v) => setBidAt(li, v)}
                        label={`Bid papan ${r.layer}`}
                        error={bidErr || ""}
                        warning={
                          isWarn
                            ? `Bid papan ${r.layer} tidak lebih rendah dari papan sebelumnya, bukan averaging down.`
                            : ""
                        }
                        gridRow={li}
                        gridCol="bid"
                      />
                    )}
                  </div>
                  <div className="mhi">
                    <label>Lot</label>
                    {customLot && !r.isExisting ? (
                      <LotInput
                        className="mhi-inp lot-edit-m"
                        value={r.lot}
                        onChange={(v) => setLotAt(li, v)}
                        label={`Lot papan ${r.layer}`}
                        gridRow={li}
                        gridCol="lot"
                        onKeyDown={(e) => handleGridNavKey(e, li, "lot")}
                      />
                    ) : (
                      <span>{n(r.lot)}</span>
                    )}
                  </div>
                  <div className="mhi">
                    <label>Sell</label>
                    <span>{r.sell}</span>
                  </div>
                </div>
                <div className="mg">
                  <div className="mgi">
                    <label>Avg</label>
                    <span>{r.avg.toFixed(2)}</span>
                  </div>
                  <div className="mgi">
                    <label>Cost</label>
                    <span>{n(r.cost)}</span>
                  </div>
                  <div className="mgi mgi-profit">
                    <label>Profit</label>
                    <span style={{ color: r.pl >= 0 ? "var(--green)" : "var(--red)" }}>
                      {fmtPL(r.pl)}
                    </span>
                  </div>
                  <div className="mgi mgi-pct">
                    <label>%</label>
                    <span
                      style={{
                        color: isUnder
                          ? "var(--brand)"
                          : r.pct >= 0
                            ? "var(--green)"
                            : "var(--red)",
                      }}
                    >
                      {isUnder && "⚠ "}
                      {fmtPct(r.pct)}
                    </span>
                  </div>
                </div>
              </SwipeableCard>
            );
          })}
          <div className="mt">
            <h2 className="pyscal-sr-only">Ringkasan total pembelian</h2>
            <div>
              <div className="mt-label">Total Cost Beli</div>
              <div className="mt-val">
                {nShort(totalCost)}
                {balance > 0 && (
                  <span className="util-m"> {Math.round((totalCost / balance) * 100)}%</span>
                )}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="mt-label">Total Lot Beli</div>
              <div className="mt-val">{n(totalLot)}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default ResultsTable;
