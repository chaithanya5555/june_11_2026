import { useMemo } from 'react';
import { Plus, Trash, ArrowUp, ArrowDown } from '@phosphor-icons/react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

/**
 * Flexible, fully-customizable variant editor.
 * Admin defines "axes" (dimensions like Brand, Model, Color, Size) in any order.
 * Each concrete variant is a row with one value per axis + stock + price modifier + image.
 *
 * Props:
 *   axes: [{ key, label, ui: 'dropdown'|'swatch'|'buttons', depends_on }]
 *   variants: [{ variant_id, options: {axisKey: value}, stock, price_modifier, image, swatch_hex }]
 *   onAxesChange(newAxes)
 *   onVariantsChange(newVariants)
 */
export default function VariantsEditor({ axes = [], variants = [], onAxesChange, onVariantsChange }) {
  const safeAxes = axes || [];
  const safeVariants = variants || [];

  const hasAxes = safeAxes.length > 0;

  const presets = useMemo(() => ([
    {
      label: 'Phone Case (Color)',
      axes: [{ key: 'color', label: 'Color', ui: 'swatch' }],
    },
    {
      label: 'Tempered Glass (Brand → Model)',
      axes: [
        { key: 'brand', label: 'Brand', ui: 'dropdown' },
        { key: 'model', label: 'Model', ui: 'dropdown', depends_on: 'brand' },
      ],
    },
    {
      label: 'Case by Device (Brand → Model → Color)',
      axes: [
        { key: 'brand', label: 'Brand', ui: 'dropdown' },
        { key: 'model', label: 'Model', ui: 'dropdown', depends_on: 'brand' },
        { key: 'color', label: 'Color', ui: 'swatch', depends_on: 'model' },
      ],
    },
  ]), []);

  const applyPreset = (preset) => {
    if (hasAxes && !window.confirm('This will replace existing axes. Continue?')) return;
    onAxesChange(preset.axes);
    onVariantsChange([]);
  };

  const addAxis = () => {
    const n = safeAxes.length;
    const fallbackKey = `axis${n + 1}`;
    onAxesChange([...safeAxes, { key: fallbackKey, label: `Option ${n + 1}`, ui: 'buttons' }]);
  };

  const updateAxis = (idx, patch) => {
    const next = safeAxes.map((a, i) => i === idx ? { ...a, ...patch } : a);
    onAxesChange(next);
    // If key renamed, update variants' options map accordingly
    if (patch.key && patch.key !== safeAxes[idx].key) {
      const oldKey = safeAxes[idx].key;
      const newKey = patch.key;
      onVariantsChange(safeVariants.map(v => {
        const { [oldKey]: oldVal, ...rest } = v.options || {};
        return { ...v, options: { ...rest, [newKey]: oldVal } };
      }));
    }
  };

  const removeAxis = (idx) => {
    if (!window.confirm('Remove this axis? All variant values for it will be cleared.')) return;
    const key = safeAxes[idx].key;
    onAxesChange(safeAxes.filter((_, i) => i !== idx));
    onVariantsChange(safeVariants.map(v => {
      const { [key]: _, ...rest } = v.options || {};
      return { ...v, options: rest };
    }));
  };

  const moveAxis = (idx, dir) => {
    const next = [...safeAxes];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    onAxesChange(next);
  };

  const addVariant = () => {
    const id = `var_${Math.random().toString(36).slice(2, 10)}`;
    const options = {};
    safeAxes.forEach(a => { options[a.key] = ''; });
    onVariantsChange([
      ...safeVariants,
      { variant_id: id, options, stock: 0, price_modifier: 0, image: '', swatch_hex: '' },
    ]);
  };

  const updateVariant = (idx, patch) => {
    onVariantsChange(safeVariants.map((v, i) => i === idx ? { ...v, ...patch } : v));
  };

  const updateVariantOption = (idx, axisKey, value) => {
    onVariantsChange(safeVariants.map((v, i) => i === idx ? { ...v, options: { ...(v.options || {}), [axisKey]: value } } : v));
  };

  const removeVariant = (idx) => {
    onVariantsChange(safeVariants.filter((_, i) => i !== idx));
  };

  const clearAll = () => {
    if (!window.confirm('Remove ALL variants and axes?')) return;
    onAxesChange([]);
    onVariantsChange([]);
  };

  return (
    <div className="border border-white/10 rounded-lg p-4 bg-white/[0.02] space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-white text-sm font-medium">Variant Options</Label>
          <p className="text-[10px] text-white/40">Define customizable options. Leave empty for simple products.</p>
        </div>
        {hasAxes && (
          <Button type="button" onClick={clearAll} variant="outline" size="sm" className="h-7 text-[10px] border-red-500/30 text-red-400 hover:bg-red-500/10">Clear All</Button>
        )}
      </div>

      {/* Quick presets */}
      {!hasAxes && (
        <div className="space-y-2">
          <p className="text-[10px] text-white/40 uppercase tracking-widest">Quick Start</p>
          <div className="flex flex-wrap gap-2">
            {presets.map(p => (
              <Button key={p.label} type="button" onClick={() => applyPreset(p)} variant="outline" size="sm" className="h-7 text-[10px] border-white/20 text-white hover:bg-white/5">
                {p.label}
              </Button>
            ))}
            <Button type="button" onClick={addAxis} variant="outline" size="sm" className="h-7 text-[10px] border-white/20 text-white hover:bg-white/5">
              <Plus size={10} className="mr-1" /> Custom Axis
            </Button>
          </div>
        </div>
      )}

      {/* AXES editor */}
      {hasAxes && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-white/40 uppercase tracking-widest">Axes (selection dimensions)</p>
            <Button type="button" onClick={addAxis} variant="outline" size="sm" className="h-6 text-[9px] border-white/20 text-white hover:bg-white/5">
              <Plus size={10} className="mr-1" /> Add Axis
            </Button>
          </div>
          <div className="space-y-2">
            {safeAxes.map((axis, idx) => (
              <div key={idx} data-testid={`axis-row-${idx}`} className="grid grid-cols-12 gap-2 items-center p-2 bg-black/30 rounded border border-white/5">
                <div className="col-span-3">
                  <Input
                    value={axis.key || ''}
                    onChange={e => updateAxis(idx, { key: e.target.value.replace(/\s+/g, '_').toLowerCase() })}
                    placeholder="key (e.g. brand)"
                    className="h-7 bg-white/5 border-white/10 text-white text-[11px] rounded font-mono"
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    value={axis.label || ''}
                    onChange={e => updateAxis(idx, { label: e.target.value })}
                    placeholder="Label (e.g. Brand)"
                    className="h-7 bg-white/5 border-white/10 text-white text-[11px] rounded"
                  />
                </div>
                <div className="col-span-3">
                  <Select value={axis.ui || 'buttons'} onValueChange={v => updateAxis(idx, { ui: v })}>
                    <SelectTrigger className="h-7 bg-white/5 border-white/10 text-white text-[11px] rounded">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0A0A0A] border-white/10">
                      <SelectItem value="dropdown" className="text-xs">Dropdown</SelectItem>
                      <SelectItem value="swatch" className="text-xs">Color Swatch</SelectItem>
                      <SelectItem value="buttons" className="text-xs">Buttons</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3 flex items-center justify-end gap-1">
                  <button type="button" onClick={() => moveAxis(idx, -1)} disabled={idx === 0} className="p-1 text-white/30 hover:text-white disabled:opacity-20"><ArrowUp size={12} /></button>
                  <button type="button" onClick={() => moveAxis(idx, 1)} disabled={idx === safeAxes.length - 1} className="p-1 text-white/30 hover:text-white disabled:opacity-20"><ArrowDown size={12} /></button>
                  <button type="button" onClick={() => removeAxis(idx)} className="p-1 text-white/30 hover:text-red-400"><Trash size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VARIANTS editor (concrete SKUs) */}
      {hasAxes && (
        <div className="space-y-2 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-white/40 uppercase tracking-widest">Variants ({safeVariants.length})</p>
            <Button type="button" onClick={addVariant} variant="outline" size="sm" className="h-6 text-[9px] border-[#007AFF]/40 text-[#007AFF] hover:bg-[#007AFF]/10">
              <Plus size={10} className="mr-1" /> Add Variant
            </Button>
          </div>

          {safeVariants.length === 0 && (
            <p className="text-[11px] text-white/30 italic px-2">No variants yet. Click "Add Variant" to create one.</p>
          )}

          {safeVariants.map((v, idx) => {
            const isColor = safeAxes.some(a => (a.ui === 'swatch') || String(a.key).toLowerCase().includes('color'));
            return (
              <div key={v.variant_id || idx} data-testid={`variant-row-${idx}`} className="p-3 bg-black/30 rounded border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-white/30">#{idx + 1} · {v.variant_id || '(new)'}</span>
                  <button type="button" onClick={() => removeVariant(idx)} className="text-white/30 hover:text-red-400"><Trash size={12} /></button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {safeAxes.map(axis => (
                    <div key={axis.key}>
                      <Label className="text-[9px] text-white/40 uppercase">{axis.label || axis.key}</Label>
                      <Input
                        value={(v.options && v.options[axis.key]) || ''}
                        onChange={e => updateVariantOption(idx, axis.key, e.target.value)}
                        placeholder={`e.g. ${axis.key === 'brand' ? 'iPhone' : axis.key === 'model' ? '15 Pro' : axis.key === 'color' ? 'Midnight Black' : ''}`}
                        className="h-7 bg-white/5 border-white/10 text-white text-[11px] rounded"
                      />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <Label className="text-[9px] text-white/40 uppercase">Stock</Label>
                    <Input
                      type="number"
                      value={v.stock ?? 0}
                      onChange={e => updateVariant(idx, { stock: parseInt(e.target.value || '0', 10) })}
                      className="h-7 bg-white/5 border-white/10 text-white text-[11px] rounded"
                    />
                  </div>
                  <div>
                    <Label className="text-[9px] text-white/40 uppercase">+₹ Price</Label>
                    <Input
                      type="number"
                      value={v.price_modifier ?? 0}
                      onChange={e => updateVariant(idx, { price_modifier: parseFloat(e.target.value || '0') })}
                      className="h-7 bg-white/5 border-white/10 text-white text-[11px] rounded"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-2">
                    <Label className="text-[9px] text-white/40 uppercase">Image URL (optional — shows as swatch & first slide)</Label>
                    <Input
                      value={v.image || ''}
                      onChange={e => updateVariant(idx, { image: e.target.value })}
                      placeholder="https://...variant.jpg"
                      className="h-7 bg-white/5 border-white/10 text-white text-[11px] rounded"
                    />
                  </div>
                </div>
                {isColor && (
                  <div>
                    <Label className="text-[9px] text-white/40 uppercase">Swatch Hex (optional, falls back to named color)</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        value={v.swatch_hex || ''}
                        onChange={e => updateVariant(idx, { swatch_hex: e.target.value })}
                        placeholder="#000000"
                        className="h-7 bg-white/5 border-white/10 text-white text-[11px] rounded font-mono"
                      />
                      {v.swatch_hex && <span className="w-6 h-6 rounded-full border border-white/20" style={{ background: v.swatch_hex }} />}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
