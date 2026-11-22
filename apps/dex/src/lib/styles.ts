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
