import { localDigits } from './localization.mjs';

// Shared source values are in millions. Bangla labels use crore (10 million).
// Separate, zero-based scales make the within-region projections legible.
export function diabetesCharts(data, language, ui, escapeHtml) {
  const e = escapeHtml;
  const label = value => {
    const rounded = value < 100 ? value : Math.round(value);
    return `${localDigits(language === 'bn' ? Number((rounded / 10).toFixed(2)) : rounded, language)} <span>${e(ui.DIABETES_UNIT)}</span>`;
  };
  return data.regions.map(region => {
    const title = ui[`DIABETES_${region.id.toUpperCase()}`];
    const max = Math.max(region.estimatedMillions, region.projectedMillions);
    const bars = [
      { value: region.estimatedMillions, year: data.estimateYear, kind: 'estimate', text: ui.DIABETES_ESTIMATE },
      { value: region.projectedMillions, year: data.projectionYear, kind: 'projection', text: ui.DIABETES_PROJECTED }
    ];
    return `<figure class="diabetes-chart" aria-labelledby="diabetes-${region.id}">
      <figcaption id="diabetes-${region.id}"><h3>${e(title)}</h3><p>${e(ui.DIABETES_CHART_LABEL)}</p></figcaption>
      <div class="diabetes-bars">${bars.map(bar => `<div class="diabetes-column">
        <div class="diabetes-bar-space"><div class="diabetes-bar ${bar.kind}" style="height:${(bar.value / max * 100).toFixed(2)}%"><strong>${label(bar.value)}</strong></div></div>
        <p class="diabetes-year">${localDigits(bar.year, language)}<span>${e(bar.text)}</span></p>
      </div>`).join('')}</div>
    </figure>`;
  }).join('');
}
