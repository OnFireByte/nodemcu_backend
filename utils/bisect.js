export function bisect(arr, value, field = null, lo = 0, hi = arr.length) {
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        const arrValue = field ? arr[mid][field] : arr[mid];
        if (arrValue < value) {
            lo = mid + 1;
        } else {
            hi = mid;
        }
    }
    return lo;
}
