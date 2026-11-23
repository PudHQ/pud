export const panel = "min-w-0 border border-t-chrome-edge border-r-chrome-highlight border-b-chrome-highlight border-l-chrome-edge bg-paper teletext:border-0 teletext:bg-black";
export const contentPanel = `${panel} grow`;
export const bar = "flex min-h-7.25 items-center gap-1.75 px-2.25 py-1 text-ui/snug font-panel";
export const activeBar = `${bar} bg-navy text-white [&_:focus-visible]:outline-orange-300
  teletext:min-h-10 teletext:bg-blue-800 teletext:px-2.5 teletext:font-pixel teletext:text-xl teletext:font-normal teletext:uppercase`;

export const link = `text-link underline underline-offset-3 visited:text-link-visited hover:text-link-hover
  teletext:text-cyan-300 teletext:visited:text-fuchsia-300 teletext:hover:text-yellow-200`;
export const favicon = `outbound:before:inline-block outbound:before:size-4 outbound:before:shrink-0
  outbound:before:bg-(image:--site-icon) outbound:before:bg-contain outbound:before:bg-center outbound:before:bg-no-repeat
  outbound:before:align-(--align-favicon) outbound:before:[image-rendering:var(--rendering-pixel)]`;

export const treeLink = `group ml-branch-label flex min-h-7.25 items-center gap-1.5 px-1.25 py-1 wrap-anywhere text-ink
  not-data-selected:hover:bg-slate-100 not-data-selected:hover:text-link data-selected:bg-selected data-selected:text-white phone:min-h-8`;
export const folderCount = "ml-auto font-mono text-caption text-slate-600 group-data-selected:text-slate-200";
export const summary = "list-none [&::-webkit-details-marker]:hidden";

export const reading = "p-reading wrap-anywhere *:max-w-note teletext:px-2.5 teletext:py-4 teletext:*:max-w-none";
export const pageTitle = `text-note-heading/tight font-extrabold tracking-heading text-balance text-navy
  teletext:font-pixel teletext:text-4xl/tight teletext:font-bold teletext:tracking-normal teletext:text-yellow-300 phone:teletext:text-3xl/tight`;
export const readingTitle = `mb-4 ${pageTitle}`;

export const teletextKey = `group/teletext-key pointer-events-auto min-h-11 min-w-0 cursor-pointer touch-manipulation
  font-sans leading-none font-extrabold select-none`;
export const teletextKeyFace = `pointer-events-none flex min-w-0 items-center justify-center border border-slate-950
  border-t-white/35 border-b-4 bg-linear-to-b shadow-sm shadow-black/60
  motion-safe:transition motion-safe:duration-150 motion-safe:ease-out
  group-hover/teletext-key:border-t-white/60 group-hover/teletext-key:brightness-110
  teletext-key-pressed:translate-y-0.5 teletext-key-pressed:scale-y-90 teletext-key-pressed:brightness-90
  teletext-key-pressed:shadow-none teletext-key-pressed:inset-shadow-sm
  teletext-key-pressed:inset-shadow-black/45 teletext-key-pressed:duration-75`;
