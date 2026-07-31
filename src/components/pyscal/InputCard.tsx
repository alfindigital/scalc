import {
  validateBid,
  validateLot,
  validateTargetTicks,
  validateTargetProfit,
  validateExistingAvg,
  validateExistingLot,
} from "@/lib/validation";
import { FieldHint, handleSetupEnter } from "./internals";

export function InputCard({
  mode,
  bids,
  baseLot,
  setBaseLot,
  targetTicks,
  setTargetTicks,
  targetProfit,
  setTargetProfit,
  existingAvg,
  setExistingAvg,
  existingLot,
  setExistingLot,
  setBidAt,
  bidAwalRef,
}) {
  return (
    <div className="card">
      {mode === "position" && (
        <div className="ig-2">
          <div>
            <div className="il il-wrap">Avg Existing (inc fee)</div>
            <input
              className="if"
              type="number"
              value={existingAvg || ""}
              min={0}
              step={0.01}
              inputMode="decimal"
              enterKeyHint="next"
              aria-label="Avg Existing (termasuk fee)"
              aria-invalid={!!validateExistingAvg(existingAvg, mode).error}
              aria-describedby="pyscal-hint-existing-avg"
              onChange={(e) => setExistingAvg(+e.target.value || 0)}
              data-kbdnav="setup"
              onKeyDown={handleSetupEnter}
            />
            <FieldHint
              id="pyscal-hint-existing-avg"
              status={validateExistingAvg(existingAvg, mode)}
            />
          </div>
          <div>
            <div className="il il-wrap">Lot Existing</div>
            <input
              className="if"
              type="number"
              value={existingLot || ""}
              min={0}
              inputMode="numeric"
              enterKeyHint="next"
              aria-label="Lot Existing"
              aria-invalid={!!validateExistingLot(existingLot, mode).error}
              aria-describedby="pyscal-hint-existing-lot"
              onChange={(e) => setExistingLot(+e.target.value || 0)}
              data-kbdnav="setup"
              onKeyDown={handleSetupEnter}
            />
            <FieldHint
              id="pyscal-hint-existing-lot"
              status={validateExistingLot(existingLot, mode)}
            />
          </div>
        </div>
      )}
      <div className="ig">
        <div>
          <div className="il il-wrap">
            {mode === "position" ? "Bid Awal (beli baru)" : "Bid Awal"}
          </div>
          <input
            ref={bidAwalRef}
            className="if"
            type="number"
            value={bids[0] || ""}
            min={1}
            inputMode="decimal"
            enterKeyHint="next"
            aria-label={mode === "position" ? "Bid Awal beli baru" : "Bid Awal"}
            aria-invalid={!!validateBid(bids[0]).error}
            aria-describedby="pyscal-hint-bid-awal"
            onChange={(e) => setBidAt(0, +e.target.value)}
            data-kbdnav="setup"
            onKeyDown={handleSetupEnter}
          />
          <FieldHint id="pyscal-hint-bid-awal" status={validateBid(bids[0])} />
        </div>
        <div>
          <div className="il il-wrap">Lot</div>
          <input
            className="if"
            type="number"
            value={baseLot}
            min={1}
            inputMode="numeric"
            enterKeyHint="next"
            aria-label="Lot dasar"
            aria-invalid={!!validateLot(baseLot).error}
            aria-describedby="pyscal-hint-base-lot"
            onChange={(e) => setBaseLot(+e.target.value)}
            data-kbdnav="setup"
            onKeyDown={handleSetupEnter}
          />
          <FieldHint id="pyscal-hint-base-lot" status={validateLot(baseLot)} />
        </div>
        <div>
          <div className="il il-wrap">Target Tick</div>
          <input
            className="if"
            type="number"
            value={targetTicks}
            min={1}
            max={20}
            inputMode="numeric"
            enterKeyHint="next"
            aria-label="Target tick"
            aria-invalid={!!validateTargetTicks(targetTicks).error}
            aria-describedby="pyscal-hint-target-ticks"
            onChange={(e) => setTargetTicks(+e.target.value)}
            data-kbdnav="setup"
            onKeyDown={handleSetupEnter}
          />
          <FieldHint id="pyscal-hint-target-ticks" status={validateTargetTicks(targetTicks)} />
        </div>
        <div>
          <div className="il il-wrap">Min Profit %</div>
          <input
            className="if"
            type="number"
            value={targetProfit}
            min={0}
            step={0.1}
            inputMode="decimal"
            enterKeyHint="done"
            aria-label="Minimum profit persen"
            aria-invalid={!!validateTargetProfit(targetProfit).error}
            aria-describedby="pyscal-hint-target-profit"
            onChange={(e) => setTargetProfit(+e.target.value)}
            data-kbdnav="setup"
            onKeyDown={handleSetupEnter}
          />
          <FieldHint id="pyscal-hint-target-profit" status={validateTargetProfit(targetProfit)} />
        </div>
      </div>
    </div>
  );
}

export default InputCard;
