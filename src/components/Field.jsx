import { useId } from "react";
import { inputStyle, labelStyle } from "../styles/theme.js";

/**
 * Labelled input / select / textarea. onChange receives the value, not the event.
 *
 *   <Field label="Amount" type="number" value={v} onChange={setV} />
 *   <Field label="Category" options={EXPENSE_CATS} value={c} onChange={setC} />
 *   <Field label="Note" rows={3} value={n} onChange={setN} />
 *   <Field label="Time" type="time" value={t} onChange={setT} />
 */
export function Field({
  label, value, onChange, options, rows,
  type = "text", placeholder, autoFocus, onEnter, min, max, step, style,
}) {
  const id = useId();
  const emit = (e) => onChange(e.target.value);

  let control;
  if (options) {
    control = (
      <select id={id} value={value} onChange={emit} style={inputStyle}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  } else if (rows) {
    control = (
      <textarea
        id={id}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={emit}
        style={{ ...inputStyle, resize: "vertical" }}
      />
    );
  } else {
    control = (
      <input
        id={id}
        type={type}
        min={min}
        max={max}
        step={step}
        value={value}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={emit}
        onKeyDown={onEnter ? (e) => { if (e.key === "Enter") { e.preventDefault(); onEnter(); } } : undefined}
        style={inputStyle}
      />
    );
  }

  return (
    <div style={style}>
      {label && <label htmlFor={id} style={labelStyle}>{label}</label>}
      {control}
    </div>
  );
}
