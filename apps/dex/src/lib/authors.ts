import profiles from "../../authors.json";

export const authors = new Map(Object.entries(profiles).map(([handle, profile]) => [
  handle, { ...profile, handle, href: "/authors/" + encodeURIComponent(handle) + "/" },
]));
