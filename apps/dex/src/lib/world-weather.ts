const cities = [
  ["WMKK", "Kuala Lumpur"],
  ["RJTT", "Tokyo"],
  ["YSSY", "Sydney"],
  ["EGLL", "London"],
  ["FACT", "Cape Town"],
  ["JFK", "New York"],
  ["SBGR", "São Paulo"],
] as const;
const source = new URL("https://mesonet.agron.iastate.edu/cgi-bin/request/asos.py");
source.search = new URLSearchParams([
  ...cities.map(([station]) => ["station", station]),
  ...["tmpc", "wxcodes", "skyc1", "skyc2", "skyc3", "skyc4"].map(field => ["data", field]),
  ["hours", "3"],
  ["tz", "Etc/UTC"],
  ["format", "onlycomma"],
  ["missing", "empty"],
  ["report_type", "3"],
  ["report_type", "4"],
]).toString();

interface CityWeather {
  city: string;
  temperature: number;
  condition: string;
  observedAt: number;
}

function describeConditions(weather: string, clouds: string[]) {
  if (weather.includes("TS")) return "Thunder";
  if (/SN|SG/.test(weather)) return "Snow";
  if (/RA|DZ/.test(weather)) return "Rain";
  if (weather.includes("FG")) return "Fog";
  if (weather.includes("BR")) return "Mist";
  if (weather.includes("HZ")) return "Haze";
  if (clouds.some(code => code === "OVC" || code === "BKN")) return "Cloudy";
  if (clouds.some(code => code === "SCT" || code === "FEW")) return "Partly cloudy";
  if (clouds.some(code => /^(CLR|SKC|CAVOK|NCD|NSC)$/.test(code))) return "Clear";
  return "";
}

export async function loadWorldWeather(signal: AbortSignal): Promise<CityWeather[]> {
  const response = await fetch(source, { signal });
  if (!response.ok) throw new Error(`Weather feed returned ${response.status}`);

  // The ASOS export's fixed fields below contain only station IDs, UTC times, numbers and weather codes.
  const lines = (await response.text()).trim().split(/\r?\n/).slice(1);
  const reports = new Map<string, Omit<CityWeather, "city">>();
  for (const line of lines) {
    const [station, valid, temp, weather = "", ...clouds] = line.split(",");
    if (!valid || !temp) continue;
    const observedAt = Date.parse(`${valid.replace(" ", "T")}:00Z`);
    const temperature = Number(temp);
    if (!Number.isFinite(temperature) || !Number.isFinite(observedAt)) continue;
    if ((reports.get(station)?.observedAt ?? 0) >= observedAt) continue;
    reports.set(station, {
      temperature: Math.round(temperature),
      condition: describeConditions(weather, clouds),
      observedAt,
    });
  }
  return cities.flatMap(([station, city]) => {
    const latest = reports.get(station);
    return latest ? [{ city, ...latest }] : [];
  });
}
