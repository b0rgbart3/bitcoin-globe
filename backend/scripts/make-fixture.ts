// ============================================================================
// backend/scripts/make-fixture.ts
// Generates a LARGE, clearly-labeled SYNTHETIC node snapshot.
//
// Why: bitnodes.io's domain expired and no live source is currently wired. We
// still need realistic counts (~24k nodes, ~63% Tor) to tune the halo and the
// bloom — 20 points tells you nothing about how 9,000 clustered points behave.
//
// The COUNTS and PROPORTIONS below are real: taken from the last published
// Bitnodes snapshot (24,557 reachable, .onion @ 62.99%, US 2695 / DE 1241 /
// FR 678 / FI 404 / CA 376 / NL 365 / GB 322 / CH 242 ...). The individual
// nodes are invented — synthetic addresses scattered around real city centres.
//
// Run:  npx tsx scripts/make-fixture.ts
// Out:  fixtures/nodes-snapshot-large.json
// ============================================================================

import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const TOTAL_REACHABLE = 24_557;
const TOR_FRACTION = 0.6299;
const CHAIN_HEIGHT = 925_600;

// [city, countryCode, lat, lng, timezone, weight]
// Weights mirror the real per-country node counts, split across that country's
// major hosting/population centres.
const CITIES: [string, string, number, number, string, number][] = [
    // United States — 2695
    ["Ashburn", "US", 39.0438, -77.4874, "America/New_York", 620],
    ["New York", "US", 40.7128, -74.006, "America/New_York", 430],
    ["Los Angeles", "US", 34.0522, -118.2437, "America/Los_Angeles", 300],
    ["Chicago", "US", 41.8781, -87.6298, "America/Chicago", 250],
    ["Dallas", "US", 32.7767, -96.797, "America/Chicago", 240],
    ["Seattle", "US", 47.6062, -122.3321, "America/Los_Angeles", 220],
    ["San Francisco", "US", 37.7749, -122.4194, "America/Los_Angeles", 210],
    ["Atlanta", "US", 33.749, -84.388, "America/New_York", 180],
    ["Denver", "US", 39.7392, -104.9903, "America/Denver", 130],
    ["Miami", "US", 25.7617, -80.1918, "America/New_York", 115],
    // Germany — 1241
    ["Falkenstein", "DE", 50.4779, 12.3713, "Europe/Berlin", 480],
    ["Frankfurt", "DE", 50.1109, 8.6821, "Europe/Berlin", 340],
    ["Nuremberg", "DE", 49.4521, 11.0767, "Europe/Berlin", 200],
    ["Berlin", "DE", 52.52, 13.405, "Europe/Berlin", 130],
    ["Munich", "DE", 48.1351, 11.582, "Europe/Berlin", 91],
    // France — 678
    ["Paris", "FR", 48.8566, 2.3522, "Europe/Paris", 300],
    ["Roubaix", "FR", 50.6942, 3.1746, "Europe/Paris", 240],
    ["Strasbourg", "FR", 48.5734, 7.7521, "Europe/Paris", 138],
    // Finland — 404
    ["Helsinki", "FI", 60.1699, 24.9384, "Europe/Helsinki", 404],
    // Canada — 376
    ["Toronto", "CA", 43.6532, -79.3832, "America/Toronto", 180],
    ["Montreal", "CA", 45.5017, -73.5673, "America/Toronto", 120],
    ["Vancouver", "CA", 49.2827, -123.1207, "America/Vancouver", 76],
    // Netherlands — 365
    ["Amsterdam", "NL", 52.3676, 4.9041, "Europe/Amsterdam", 285],
    ["Rotterdam", "NL", 51.9244, 4.4777, "Europe/Amsterdam", 80],
    // United Kingdom — 322
    ["London", "GB", 51.5074, -0.1278, "Europe/London", 230],
    ["Manchester", "GB", 53.4808, -2.2426, "Europe/London", 92],
    // Switzerland — 242
    ["Zurich", "CH", 47.3769, 8.5417, "Europe/Zurich", 170],
    ["Geneva", "CH", 46.2044, 6.1432, "Europe/Zurich", 72],
    // Russia — 191
    ["Moscow", "RU", 55.7558, 37.6173, "Europe/Moscow", 140],
    ["Saint Petersburg", "RU", 59.9311, 30.3609, "Europe/Moscow", 51],
    // Australia — 187
    ["Sydney", "AU", -33.8688, 151.2093, "Australia/Sydney", 120],
    ["Melbourne", "AU", -37.8136, 144.9631, "Australia/Melbourne", 67],
    // Korea — 154
    ["Seoul", "KR", 37.5665, 126.978, "Asia/Seoul", 154],
    // Spain — 140
    ["Madrid", "ES", 40.4168, -3.7038, "Europe/Madrid", 90],
    ["Barcelona", "ES", 41.3874, 2.1686, "Europe/Madrid", 50],
    // Singapore — 121
    ["Singapore", "SG", 1.3521, 103.8198, "Asia/Singapore", 121],
    // Japan — 117
    ["Tokyo", "JP", 35.6762, 139.6503, "Asia/Tokyo", 90],
    ["Osaka", "JP", 34.6937, 135.5023, "Asia/Tokyo", 27],
    // remainder of the long tail
    ["Prague", "CZ", 50.0755, 14.4378, "Europe/Prague", 105],
    ["Milan", "IT", 45.4642, 9.19, "Europe/Rome", 100],
    ["Stockholm", "SE", 59.3293, 18.0686, "Europe/Stockholm", 94],
    ["Sao Paulo", "BR", -23.5505, -46.6333, "America/Sao_Paulo", 87],
    ["Vienna", "AT", 48.2082, 16.3738, "Europe/Vienna", 83],
    ["Warsaw", "PL", 52.2297, 21.0122, "Europe/Warsaw", 73],
    ["Hong Kong", "HK", 22.3193, 114.1694, "Asia/Hong_Kong", 62],
    ["Dublin", "IE", 53.3498, -6.2603, "Europe/Dublin", 51],
    ["Brussels", "BE", 50.8503, 4.3517, "Europe/Brussels", 44],
    ["Kyiv", "UA", 50.4501, 30.5234, "Europe/Kyiv", 43],
    ["Oslo", "NO", 59.9139, 10.7522, "Europe/Oslo", 40],
    ["Copenhagen", "DK", 55.6761, 12.5683, "Europe/Copenhagen", 38],
    ["Mumbai", "IN", 19.076, 72.8777, "Asia/Kolkata", 35],
    ["Johannesburg", "ZA", -26.2041, 28.0473, "Africa/Johannesburg", 22],
    ["Mexico City", "MX", 19.4326, -99.1332, "America/Mexico_City", 20],
    ["Buenos Aires", "AR", -34.6037, -58.3816, "America/Argentina/Buenos_Aires", 18],
    ["Istanbul", "TR", 41.0082, 28.9784, "Europe/Istanbul", 17],
    ["Auckland", "NZ", -36.8485, 174.7633, "Pacific/Auckland", 15],
    ["Taipei", "TW", 25.033, 121.5654, "Asia/Taipei", 14],
    ["Bangkok", "TH", 13.7563, 100.5018, "Asia/Bangkok", 12],
    ["Lagos", "NG", 6.5244, 3.3792, "Africa/Lagos", 8],
    ["Nairobi", "KE", -1.2864, 36.8172, "Africa/Nairobi", 6],
    // ---- the long tail --------------------------------------------------------
    // The published snapshot named only ~24 countries (US 2695 … UA 43, summing to
    // ~7,975) against ~8,784 located nodes. The ~800-node remainder is the tail it
    // truncated. These cities distribute that remainder. The TOTAL is derived from
    // real data; the per-city split is invented — plausible, not measured.
    // Latin America
    ["Bogota", "CO", 4.711, -74.0721, "America/Bogota", 12],
    ["Santiago", "CL", -33.4489, -70.6693, "America/Santiago", 14],
    ["Lima", "PE", -12.0464, -77.0428, "America/Lima", 8],
    ["Montevideo", "UY", -34.9011, -56.1645, "America/Montevideo", 7],
    ["Caracas", "VE", 10.4806, -66.9036, "America/Caracas", 6],
    ["Panama City", "PA", 8.9824, -79.5199, "America/Panama", 6],
    ["San Jose", "CR", 9.9281, -84.0907, "America/Costa_Rica", 5],
    ["Quito", "EC", -0.1807, -78.4678, "America/Guayaquil", 4],
    ["Guatemala City", "GT", 14.6349, -90.5069, "America/Guatemala", 3],
    ["Asuncion", "PY", -25.2637, -57.5759, "America/Asuncion", 3],
    ["La Paz", "BO", -16.4897, -68.1193, "America/La_Paz", 3],
    // Middle East / Caucasus
    ["Tel Aviv", "IL", 32.0853, 34.7818, "Asia/Jerusalem", 24],
    ["Dubai", "AE", 25.2048, 55.2708, "Asia/Dubai", 18],
    ["Riyadh", "SA", 24.7136, 46.6753, "Asia/Riyadh", 6],
    ["Tehran", "IR", 35.6892, 51.389, "Asia/Tehran", 5],
    ["Baku", "AZ", 40.4093, 49.8671, "Asia/Baku", 4],
    ["Doha", "QA", 25.2854, 51.531, "Asia/Qatar", 4],
    ["Amman", "JO", 31.9454, 35.9284, "Asia/Amman", 3],
    ["Beirut", "LB", 33.8938, 35.5018, "Asia/Beirut", 3],
    ["Kuwait City", "KW", 29.3759, 47.9774, "Asia/Kuwait", 3],
    // Asia
    ["Bangalore", "IN", 12.9716, 77.5946, "Asia/Kolkata", 14],
    ["Shanghai", "CN", 31.2304, 121.4737, "Asia/Shanghai", 12],
    ["Jakarta", "ID", -6.2088, 106.8456, "Asia/Jakarta", 12],
    ["Kuala Lumpur", "MY", 3.139, 101.6869, "Asia/Kuala_Lumpur", 12],
    ["Delhi", "IN", 28.6139, 77.209, "Asia/Kolkata", 10],
    ["Manila", "PH", 14.5995, 120.9842, "Asia/Manila", 10],
    ["Ho Chi Minh City", "VN", 10.8231, 106.6297, "Asia/Ho_Chi_Minh", 10],
    ["Beijing", "CN", 39.9042, 116.4074, "Asia/Shanghai", 10],
    ["Chennai", "IN", 13.0827, 80.2707, "Asia/Kolkata", 8],
    ["Shenzhen", "CN", 22.5431, 114.0579, "Asia/Shanghai", 8],
    ["Almaty", "KZ", 43.222, 76.8512, "Asia/Almaty", 6],
    ["Hanoi", "VN", 21.0285, 105.8542, "Asia/Ho_Chi_Minh", 5],
    ["Karachi", "PK", 24.8607, 67.0011, "Asia/Karachi", 4],
    ["Colombo", "LK", 6.9271, 79.8612, "Asia/Colombo", 3],
    ["Dhaka", "BD", 23.8103, 90.4125, "Asia/Dhaka", 3],
    ["Tashkent", "UZ", 41.2995, 69.2401, "Asia/Tashkent", 3],
    ["Kathmandu", "NP", 27.7172, 85.324, "Asia/Kathmandu", 2],
    ["Ulaanbaatar", "MN", 47.8864, 106.9057, "Asia/Ulaanbaatar", 2],
    // Europe long tail
    ["Lisbon", "PT", 38.7223, -9.1393, "Europe/Lisbon", 20],
    ["Bucharest", "RO", 44.4268, 26.1025, "Europe/Bucharest", 20],
    ["Budapest", "HU", 47.4979, 19.0402, "Europe/Budapest", 18],
    ["Athens", "GR", 37.9838, 23.7275, "Europe/Athens", 14],
    ["Sofia", "BG", 42.6977, 23.3219, "Europe/Sofia", 14],
    ["Tallinn", "EE", 59.437, 24.7536, "Europe/Tallinn", 10],
    ["Zagreb", "HR", 45.815, 15.9819, "Europe/Zagreb", 8],
    ["Bratislava", "SK", 48.1486, 17.1077, "Europe/Bratislava", 8],
    ["Riga", "LV", 56.9496, 24.1052, "Europe/Riga", 8],
    ["Vilnius", "LT", 54.6872, 25.2797, "Europe/Vilnius", 8],
    ["Reykjavik", "IS", 64.1466, -21.9426, "Atlantic/Reykjavik", 8],
    ["Luxembourg", "LU", 49.6116, 6.1319, "Europe/Luxembourg", 8],
    ["Belgrade", "RS", 44.7866, 20.4489, "Europe/Belgrade", 8],
    ["Ljubljana", "SI", 46.0569, 14.5058, "Europe/Ljubljana", 6],
    ["Minsk", "BY", 53.9006, 27.559, "Europe/Minsk", 5],
    ["Tbilisi", "GE", 41.7151, 44.8271, "Asia/Tbilisi", 4],
    ["Nicosia", "CY", 35.1856, 33.3823, "Asia/Nicosia", 4],
    ["Yerevan", "AM", 40.1792, 44.4991, "Asia/Yerevan", 3],
    ["Chisinau", "MD", 47.0105, 28.8638, "Europe/Chisinau", 3],
    ["Valletta", "MT", 35.8989, 14.5146, "Europe/Malta", 3],
    ["Sarajevo", "BA", 43.8563, 18.4131, "Europe/Sarajevo", 2],
    ["Skopje", "MK", 41.9973, 21.428, "Europe/Skopje", 2],
    // Africa
    ["Cape Town", "ZA", -33.9249, 18.4241, "Africa/Johannesburg", 10],
    ["Casablanca", "MA", 33.5731, -7.5898, "Africa/Casablanca", 6],
    ["Accra", "GH", 5.6037, -0.187, "Africa/Accra", 5],
    ["Abuja", "NG", 9.0765, 7.3986, "Africa/Lagos", 4],
    ["Tunis", "TN", 36.8065, 10.1815, "Africa/Tunis", 3],
    ["Algiers", "DZ", 36.7538, 3.0588, "Africa/Algiers", 3],
    ["Dar es Salaam", "TZ", -6.7924, 39.2083, "Africa/Dar_es_Salaam", 3],
    ["Kampala", "UG", 0.3476, 32.5825, "Africa/Kampala", 3],
    ["Addis Ababa", "ET", 9.032, 38.7469, "Africa/Addis_Ababa", 2],
    ["Harare", "ZW", -17.8252, 31.0335, "Africa/Harare", 2],
    // Oceania
    ["Brisbane", "AU", -27.4698, 153.0251, "Australia/Brisbane", 8],
    ["Perth", "AU", -31.9505, 115.8605, "Australia/Perth", 8],
    ["Wellington", "NZ", -41.2866, 174.7756, "Pacific/Auckland", 5],
];

const CLIENTS = [
    "/Satoshi:30.2.0/", "/Satoshi:28.1.0/", "/Satoshi:29.3.0/", "/Satoshi:30.0.0/",
    "/Satoshi:27.1.0/", "/Satoshi:26.0.0/", "/Knots:0.27.1/",
];
const ORGS: [string, string][] = [
    ["AS24940", "Hetzner Online GmbH"], ["AS16509", "Amazon.com"], ["AS14061", "DigitalOcean LLC"],
    ["AS16276", "OVH SAS"], ["AS7922", "Comcast Cable"], ["AS63949", "Akamai/Linode"],
    ["AS20473", "The Constant Company"], ["AS3320", "Deutsche Telekom"],
];

// Deterministic PRNG so regenerating gives the identical fixture.
let seed = 42;
const rnd = (): number => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
};


const pick = <T,>(a: T[]): T => a[Math.floor(rnd() * a.length)]!;

// Reserved documentation ranges only — never real addresses.
// const docIp = (n: number): string => {
//     const blocks = ["192.0.2", "198.51.100", "203.0.113"];
//     return `${blocks[n % 3]}.${(n % 254) + 1}`;
// };
// Reserved, non-routable: 198.18.0.0/15 is reserved for benchmarking (RFC 2544),
// giving ~130k addresses — enough for unique synthetic nodes without collisions.
const synthIp = (n: number): string => `198.18.${Math.floor(n / 254)}.${(n % 254) + 1}`;

const onion = (n: number): string =>
    `${n.toString(36).padStart(8, "0")}synthetic${(n * 7).toString(36)}fixture.onion`;

const gauss = (): number => {
    const u = 1 - rnd(), v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

async function main() {
    const torCount = Math.round(TOTAL_REACHABLE * TOR_FRACTION);
    const locatedTarget = TOTAL_REACHABLE - torCount;
    const totalWeight = CITIES.reduce((s, c) => s + c[5], 0);

    const nodes: Record<string, unknown[]> = {};
    let i = 0;

    for (const [city, cc, lat, lng, tz, weight] of CITIES) {
        const n = Math.round((weight / totalWeight) * locatedTarget);
        // Gaussian sigma scaled by sqrt(n): bigger metros cover more ground, but a
        // 700-node city isn't 100x wider than a 7-node one.
        const spread = 0.3 + Math.sqrt(n) * 0.03;
        // Longitude degrees narrow toward the poles — keeps clusters circular.
        const cosLat = Math.max(Math.cos((lat * Math.PI) / 180), 0.2);

        for (let k = 0; k < n; k++, i++) {
            const [asn, org] = pick(ORGS);
            const jLat = lat + gauss() * spread;
            const jLng = lng + (gauss() * spread) / cosLat;
            nodes[`${synthIp(i)}:8333`] = [
                70016, pick(CLIENTS), 1751200000 + i, rnd() > 0.1 ? 1037 : 1033, CHAIN_HEIGHT,
                null, city, cc, +jLat.toFixed(4), +jLng.toFixed(4), tz, asn, org,
            ];
        }
    }

    const located = i;
    for (let k = 0; k < torCount; k++, i++) {
        nodes[`${onion(i)}:8333`] = [70016, pick(CLIENTS), 1751200000 + i, rnd() > 0.1 ? 1037 : 1033, CHAIN_HEIGHT];
    }

    const snapshot = {
        _comment:
            "SYNTHETIC FIXTURE — NOT a live snapshot. Generated by scripts/make-fixture.ts. " +
            "Counts and country proportions mirror the last published Bitnodes snapshot " +
            "(24,557 reachable, .onion @ 62.99%); individual nodes are invented and use " +
            "reserved non-routable IP ranges. Do not present as real network data.",
        timestamp: Math.floor(Date.now() / 1000),
        total_nodes: located + torCount,
        latest_height: CHAIN_HEIGHT,
        nodes,
    };

    const dir = fileURLToPath(new URL("../fixtures/", import.meta.url));
    await mkdir(dir, { recursive: true });
    const out = `${dir}nodes-snapshot-large.json`;
    await writeFile(out, JSON.stringify(snapshot), "utf8");
    console.log(`wrote ${out}\n  ${located} located + ${torCount} unlocatable = ${located + torCount} nodes`);
}
main();