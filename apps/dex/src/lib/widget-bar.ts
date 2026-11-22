import { mountRunner } from "./widget-runner";
import { loadWorldWeather } from "./world-weather";

const preferenceKey = "puddex:active-widget";
const pixelsPerMs = 0.036;
const stockScript = "https://widgets.tradingview-widget.com/w/en/tv-ticker-tape.js";
const stockSource = "https://www.tradingview.com/markets/";
const weatherSource = "https://mesonet.agron.iastate.edu/info/datasets/";
const marketsUrl = "https://gamma-api.polymarket.com/markets?active=true&closed=false&order=volume24hr&ascending=false&limit=10";
const percent = new Intl.NumberFormat(undefined, { style: "percent", maximumFractionDigits: 1 });
const observationTime = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

interface Market {
  question?: string;
  slug?: string;
  events?: { slug?: string }[];
  outcomes?: string;
  outcomePrices?: string;
}

type Feed = "markets" | "weather";
type Item = { primary: string; secondary: string; title: string } &
  ({ rank: number; href: string } | { condition: string });

function parseList(value?: string): string[] {
  try {
    const list: unknown = JSON.parse(value ?? "[]");
    if (Array.isArray(list) && list.every(item => typeof item === "string")) return list;
  } catch {}
  return [];
}

async function loadMarkets(signal: AbortSignal): Promise<Item[]> {
  const response = await fetch(marketsUrl, { signal });
  if (!response.ok) throw new Error(`Market feed returned ${response.status}`);
  const markets: Market[] = await response.json();
  return markets.slice(0, 10).flatMap(({ question, slug, events, outcomes, outcomePrices }, index) => {
    const eventSlug = events?.[0]?.slug ?? slug;
    if (!question || !eventSlug) return [];
    const names = parseList(outcomes);
    const outcomeIndex = Math.max(0, names.indexOf("Yes"));
    const odds = parseList(outcomePrices)[outcomeIndex];
    const value = odds?.trim() ? Number(odds) : NaN;
    const secondary = names[outcomeIndex] && value >= 0 && value <= 1
      ? `${names[outcomeIndex]} ${percent.format(value)}` : "";
    const marketPath = slug && slug !== eventSlug ? `/${encodeURIComponent(slug)}` : "";
    return [{
      primary: question,
      secondary,
      title: question,
      rank: index + 1,
      href: `https://polymarket.com/event/${encodeURIComponent(eventSlug)}${marketPath}`,
    }];
  });
}

async function loadWeather(signal: AbortSignal): Promise<Item[]> {
  const weather = await loadWorldWeather(signal);
  return weather.map(({ city, temperature, condition, observedAt }) => ({
    primary: city,
    secondary: `${temperature}°C`,
    title: [`Airport observation for ${city}`, condition, observationTime.format(observedAt)].filter(Boolean).join(" · "),
    condition,
  }));
}

const feeds = {
  markets: { load: loadMarkets, label: "Polymarket", lifetime: 5 * 60_000 },
  weather: { load: loadWeather, label: "World weather", lifetime: 10 * 60_000 },
};
const conditionIcon: Record<string, string> = {
  Clear: "sun",
  Cloudy: "cloud",
  Fog: "cloud",
  Mist: "cloud",
  Haze: "cloud",
  Rain: "rain",
  Thunder: "rain",
  Snow: "rain",
};

export function mountWidgetBar(bar: HTMLElement, signal: AbortSignal) {
  const picker = bar.querySelector<HTMLDetailsElement>("[data-widget-picker]")!;
  const cog = picker.querySelector<HTMLElement>("summary")!;
  const choices = Array.from(bar.querySelectorAll<HTMLButtonElement>("[data-widget-choice]"));
  const off = choices.find(choice => choice.dataset.widgetChoice === "off")!;
  const headings = bar.querySelectorAll<HTMLElement>("[data-widget-heading]");
  const data = bar.querySelector<HTMLElement>("[data-widget-data]")!;
  const scroll = bar.querySelector<HTMLElement>("[data-widget-scroll]")!;
  const items = bar.querySelector<HTMLUListElement>("[data-widget-items]")!;
  const repeat = bar.querySelector<HTMLElement>("[data-widget-repeat]")!;
  const status = bar.querySelector<HTMLElement>("[data-widget-status]")!;
  const runnerView = bar.querySelector<HTMLElement>("[data-widget-runner]")!;
  const runnerAction = bar.querySelector<HTMLButtonElement>("[data-runner-action]")!;
  const pause = bar.querySelector<HTMLButtonElement>("[data-widget-pause]")!;
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const cache = new Map<Feed, { rows: Item[]; expires: number }>();
  const loading = new Set<Feed>();
  let active: string | undefined;
  let stockRequest: HTMLScriptElement | undefined;
  let frame = 0;
  let lastTime = 0;
  let offset = 0;
  let loopWidth = 0;
  let repeatCount = 0;
  let tapePaused = motion.matches;
  let pointerInside = false;
  let focusInside = false;

  function canMove() {
    if (signal.aborted || document.hidden || picker.open) return false;
    if (active === "runner") return runner.scrolling || (runner.idle && !motion.matches);
    return loopWidth > 0 && !tapePaused && !pointerInside && !focusInside;
  }

  function move(now: number) {
    frame = 0;
    if (!canMove()) {
      lastTime = 0;
      return;
    }
    const elapsed = lastTime ? Math.min(now - lastTime, 50) : 0;
    lastTime = now;
    const travel = elapsed * pixelsPerMs;
    if (active === "runner") runner.step(travel);
    else {
      offset = (offset + travel) % loopWidth;
      scroll.scrollLeft = offset;
    }
    wake();
  }

  function wake() {
    if (canMove()) {
      if (!frame) frame = requestAnimationFrame(move);
    } else {
      cancelAnimationFrame(frame);
      frame = lastTime = 0;
    }
  }

  const runner = mountRunner(bar, wake, pixelsPerMs, signal);

  function template(name: string) {
    const fragment = bar.querySelector<HTMLTemplateElement>(`template[data-widget-${name}]`)!.content;
    return document.importNode(fragment, true).firstElementChild as HTMLLIElement;
  }

  function freezeStockTape(root: Element) {
    for (const tape of root.querySelectorAll<HTMLElement & { disableScroll: boolean }>("tv-ticker-tape")) {
      tape.disableScroll = true;
    }
  }

  function fillRepeats(force = false) {
    loopWidth = items.offsetWidth;
    const count = loopWidth ? Math.ceil(scroll.clientWidth / loopWidth) : 0;
    if (force || count !== repeatCount) {
      const replicas = document.createDocumentFragment();
      for (let i = 0; i < count; i++) {
        const clone = items.cloneNode(true) as HTMLUListElement;
        clone.removeAttribute("data-widget-items");
        for (const link of clone.querySelectorAll("a")) link.tabIndex = -1;
        if (active === "stocks") clone.inert = true;
        replicas.append(clone);
      }
      repeat.replaceChildren(replicas);
      if (active === "stocks") freezeStockTape(repeat);
      repeatCount = count;
    }
    wake();
  }

  function announce(message: string) {
    status.textContent = message;
    status.hidden = !message;
  }

  function render(elements: HTMLLIElement[], reset: boolean) {
    const position = reset ? 0 : scroll.scrollLeft;
    items.replaceChildren(...elements);
    fillRepeats(true);
    offset = loopWidth ? position % loopWidth : 0;
    scroll.scrollLeft = offset;
    announce("");
  }

  function sourceLink(href: string, label: string) {
    const entry = template("source");
    const link = entry.querySelector<HTMLAnchorElement>("a")!;
    link.href = href;
    link.textContent = label;
    return entry;
  }

  function renderStocks() {
    const quotes = template("stock");
    render([quotes, sourceLink(stockSource, "Ticker tape by TradingView · delayed")], true);
    freezeStockTape(quotes);
  }

  function showStocks() {
    if (customElements.get("tv-ticker-tape")) {
      renderStocks();
      return;
    }
    render([], true);
    announce("Loading Nasdaq…");
    if (stockRequest) return;

    const script = document.createElement("script");
    stockRequest = script;
    script.type = "module";
    script.src = stockScript;
    const fallback = () => {
      stockRequest = undefined;
      script.remove();
      if (active === "stocks") {
        render([sourceLink(stockSource, "Nasdaq quotes on TradingView ↗")], true);
      }
    };
    script.addEventListener("load", () => {
      if (!customElements.get("tv-ticker-tape")) fallback();
      else if (active === "stocks") renderStocks();
    }, { once: true, signal });
    script.addEventListener("error", fallback, { once: true, signal });
    document.head.append(script);
  }

  function renderFeed(feed: Feed, rows: Item[], reset: boolean) {
    const elements = rows.map(row => {
      const entry = template("href" in row ? "market" : "weather");
      entry.title = row.title;
      entry.querySelector("[data-widget-primary]")!.textContent = row.primary;
      entry.querySelector("[data-widget-secondary]")!.textContent = row.secondary;
      if ("href" in row) {
        entry.querySelector<HTMLAnchorElement>("[data-widget-link]")!.href = row.href;
        entry.querySelector("[data-widget-rank]")!.textContent = `${row.rank}.`;
      } else {
        const icon = conditionIcon[row.condition] ?? "weather";
        entry.querySelector<HTMLElement>(`[data-weather-icon="${icon}"]`)!.hidden = false;
        const condition = entry.querySelector<HTMLElement>("[data-widget-condition]")!;
        condition.textContent = row.condition;
        condition.hidden = !row.condition;
      }
      return entry;
    });
    if (feed === "weather" && rows.length) elements.push(sourceLink(weatherSource, "Airport observations · Iowa Environmental Mesonet ↗"));
    render(elements, reset);
  }

  async function refreshFeed() {
    if (active !== "markets" && active !== "weather") return;
    const feed = active;
    const saved = cache.get(feed);
    if (document.hidden || loading.has(feed) || (saved && saved.expires > Date.now()) || focusInside || pointerInside) return;

    const { load, label, lifetime } = feeds[feed];
    if (!saved) announce(`Loading ${label}…`);
    loading.add(feed);
    try {
      const rows = await load(AbortSignal.any([signal, AbortSignal.timeout(8000)]));
      if (!rows.length) throw new Error("Feed is empty");
      cache.set(feed, { rows, expires: Date.now() + lifetime });
      if (active === feed && (!saved || (!focusInside && !pointerInside))) renderFeed(feed, rows, false);
    } catch {
      if (!signal.aborted && active === feed && !saved) announce(`${label} unavailable`);
    } finally {
      loading.delete(feed);
    }
  }

  function select(choice: HTMLButtonElement) {
    active = choice.dataset.widgetChoice;
    const hidden = choice === off;
    bar.toggleAttribute("data-widget-off", hidden);
    off.hidden = hidden;
    for (const button of choices) {
      if (button !== off) button.ariaPressed = String(button === choice);
    }
    for (const heading of headings) heading.hidden = heading.dataset.widgetHeading !== active;
    pointerInside = focusInside = false;
    const showRunner = active === "runner";
    data.hidden = pause.hidden = hidden || showRunner;
    runnerView.hidden = runnerAction.hidden = !showRunner;
    if (!showRunner) runner.pause();
    if (hidden || showRunner) render([], true);
    else {
      if (active === "stocks") showStocks();
      else if (active === "markets" || active === "weather") {
        const saved = cache.get(active);
        renderFeed(active, saved?.rows ?? [], true);
        if (!saved) announce(`Loading ${feeds[active].label}…`);
        void refreshFeed();
      }
    }
    wake();
  }

  function setPaused(value: boolean) {
    tapePaused = value;
    pause.ariaLabel = pause.title = value ? "Resume ticker" : "Pause ticker";
    pause.textContent = value ? "▶" : "Ⅱ";
    wake();
  }

  for (const choice of choices) {
    choice.addEventListener("click", () => {
      select(choice);
      try {
        if (choice === off) localStorage.removeItem(preferenceKey);
        else localStorage.setItem(preferenceKey, choice.dataset.widgetChoice!);
      } catch {}
      picker.open = false;
      (active === "runner" ? runnerAction : cog).focus({ preventScroll: true });
    }, { signal });
  }
  picker.addEventListener("toggle", () => {
    if (picker.open) runner.pause();
    wake();
  }, { signal });
  document.addEventListener("pointerdown", event => {
    if (picker.open && !event.composedPath().includes(picker)) picker.open = false;
  }, { signal });
  picker.addEventListener("keydown", event => {
    if (event.key !== "Escape" || !picker.open) return;
    event.preventDefault();
    picker.open = false;
    cog.focus({ preventScroll: true });
  }, { signal });
  document.addEventListener("astro:before-swap", () => {
    picker.open = false;
    runner.pause();
  }, { signal });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) runner.pause();
    else void refreshFeed();
    wake();
  }, { signal });

  scroll.addEventListener("pointerenter", event => {
    if (event.pointerType === "touch") return;
    pointerInside = true;
    wake();
  }, { signal });
  scroll.addEventListener("pointerleave", () => {
    pointerInside = false;
    void refreshFeed();
    wake();
  }, { signal });
  scroll.addEventListener("focusin", () => {
    focusInside = true;
    wake();
  }, { signal });
  scroll.addEventListener("focusout", event => {
    focusInside = event.relatedTarget instanceof Node && scroll.contains(event.relatedTarget);
    void refreshFeed();
    wake();
  }, { signal });
  scroll.addEventListener("scroll", () => {
    if (loopWidth && !canMove()) offset = scroll.scrollLeft % loopWidth;
  }, { passive: true, signal });
  pause.addEventListener("click", () => setPaused(!tapePaused), { signal });
  motion.addEventListener("change", () => setPaused(motion.matches), { signal });

  const resize = new ResizeObserver(() => fillRepeats());
  resize.observe(scroll);
  resize.observe(items);
  const timer = window.setInterval(refreshFeed, 60_000);
  signal.addEventListener("abort", () => {
    clearInterval(timer);
    cancelAnimationFrame(frame);
    resize.disconnect();
  }, { once: true });

  let saved: string | null = null;
  try { saved = localStorage.getItem(preferenceKey); } catch {}
  setPaused(motion.matches);
  select(choices.find(choice => choice.dataset.widgetChoice === saved) ?? off);
}
