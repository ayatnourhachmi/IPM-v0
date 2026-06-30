export function formatIviPercent(value: number) {
    const clamped = Math.max(0, Math.min(100, value));
    const rounded = Math.round(clamped * 10) / 10;
    return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}%`;
}
