// @ts-nocheck
import { useRef } from "react";
import { terbilang } from "@/lib/format";
import { DEFAULT_SHORTCUTS, shortcutToString } from "@/lib/storage";
import { SunIcon, MoonIcon, XIcon, KeyboardIcon } from "./icons";
import { InstallAppRow } from "./internals";

export function SettingsPanel({
  theme, setTheme, balance, setBalance, feeBuy, setFeeBuy, feeSell, setFeeSell,
  presets, presetName, setPresetName, savePreset, deletePreset, loadPreset,
  exportPresets, importPresets,
  exportAll, importAll,
  shortcuts, setShortcuts, recordingShortcut, setRecordingShortcut,
  motion, setMotion,
}) {
  const fileInputRef = useRef(null);
  const fullBackupInputRef = useRef(null);
  return (
    <div className="settings-panel">
      <div className="sp-section">
        <div className="sp-title">Tampilan</div>
        <div className="theme-pill">
          <button className={theme === 'light' ? 'active' : ''} onClick={() => setTheme('light')}>
            <SunIcon /> Light
          </button>
          <button className={theme === 'dark' ? 'active' : ''} onClick={() => setTheme('dark')}>
            <MoonIcon /> Dark
          </button>
        </div>
      </div>

      <div className="sp-section">
        <div className="sp-title">Animasi</div>
        <div className="theme-pill" role="radiogroup" aria-label="Reduced motion">
          <button
            className={motion === 'auto' ? 'active' : ''}
            role="radio"
            aria-checked={motion === 'auto'}
            data-motion="auto"
            onClick={() => setMotion('auto')}
          >Auto</button>
          <button
            className={motion === 'normal' ? 'active' : ''}
            role="radio"
            aria-checked={motion === 'normal'}
            data-motion="normal"
            onClick={() => setMotion('normal')}
          >Normal</button>
          <button
            className={motion === 'reduce' ? 'active' : ''}
            role="radio"
            aria-checked={motion === 'reduce'}
            data-motion="reduce"
            onClick={() => setMotion('reduce')}
          >Kurangi</button>
        </div>
        <div className="sp-empty" style={{ marginTop: 6 }}>
          Auto ikut pengaturan OS. Kurangi mematikan rotator sosial &amp; animasi UI segera.
        </div>
      </div>

      <div className="sp-section">
        <div className="sp-title">Trading Balance</div>
        <input className="sp-input" type="number" value={balance || ''} min={0}
          placeholder="Kosongkan jika tidak dibutuhkan"
          inputMode="numeric" enterKeyHint="done"
          onChange={e => setBalance(+e.target.value || 0)} />
        {balance > 0 && (
          <div className="terbilang"><strong>{terbilang(balance)}</strong> rupiah</div>
        )}
      </div>

      <div className="sp-section">
        <div className="sp-title">Fee Broker</div>
        <div className="sp-row">
          <div>
            <div className="sp-label">Buy Fee %</div>
            <input className="sp-input" type="number" value={feeBuy} step={0.01}
              inputMode="decimal" enterKeyHint="next"
              onChange={e => setFeeBuy(+e.target.value)} />
          </div>
          <div>
            <div className="sp-label">Sell Fee %</div>
            <input className="sp-input" type="number" value={feeSell} step={0.01}
              inputMode="decimal" enterKeyHint="done"
              onChange={e => setFeeSell(+e.target.value)} />
          </div>
        </div>
      </div>

      <div className="sp-section">
        <div className="sp-title">Preset</div>
        {presets.length > 0 ? (
          <div className="sp-presets">
            {presets.map(p => (
              <div key={p.name} className="sp-preset-item">
                <button className="sp-preset-load" onClick={() => loadPreset(p)}>{p.name}</button>
                <button className="sp-preset-x" onClick={() => deletePreset(p.name)}><XIcon /></button>
              </div>
            ))}
          </div>
        ) : (
          <div className="sp-empty">Belum ada preset</div>
        )}
        <div className="sp-preset-save">
          <input placeholder="Scalping" value={presetName} maxLength={8}
            onChange={e => setPresetName(e.target.value.toUpperCase())}
            onKeyDown={e => { if (e.key === 'Enter') savePreset(); }} />
          <button onClick={savePreset} disabled={!presetName.trim()}>Simpan</button>
        </div>
        <div className="sp-import-export">
          <button className="sp-ie-btn" onClick={exportPresets}>↓ Export</button>
          <button className="sp-ie-btn" onClick={() => fileInputRef.current?.click()}>↑ Import</button>
          <input ref={fileInputRef} type="file" accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importPresets(file);
              e.target.value = '';
            }} />
        </div>
      </div>

      <div className="sp-section">
        <div className="sp-title">Backup Lengkap</div>
        <div className="sp-empty" style={{ marginBottom: 6 }}>
          State, preset, history, shortcut, tema dalam 1 file JSON. Untuk pindah device atau jaga-jaga.
        </div>
        <div className="sp-import-export">
          <button className="sp-ie-btn" onClick={exportAll}>↓ Export Semua</button>
          <button className="sp-ie-btn" onClick={() => fullBackupInputRef.current?.click()}>↑ Restore</button>
          <input ref={fullBackupInputRef} type="file" accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importAll(file);
              e.target.value = '';
            }} />
        </div>
      </div>

      <div className="sp-section">
        <div className="sp-title">Install App</div>
        <InstallAppRow />
      </div>

      <div className="sp-section">
        <div className="sp-title"><KeyboardIcon /> Shortcut</div>
        <div className="kbd-list">
          {Object.entries(shortcuts).map(([key, s]) => (
            <div key={key} className="kbd-row">
              <label>{s.label}</label>
              <input
                className={`kbd-input ${recordingShortcut === key ? 'recording' : ''}`}
                value={recordingShortcut === key ? 'TEKAN...' : shortcutToString(s)}
                readOnly
                onFocus={() => setRecordingShortcut(key)}
                onBlur={() => setRecordingShortcut(null)}
              />
            </div>
          ))}
          <button className="kbd-reset" onClick={() => setShortcuts(DEFAULT_SHORTCUTS)}>
            Reset ke default
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsPanel;