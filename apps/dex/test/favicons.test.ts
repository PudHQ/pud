import { expect, test } from "bun:test";
import sharp from "sharp";
import { faviconForHost, styliseFavicon } from "../src/lib/favicons";

test("favicons keep their aspect ratio, transparent padding and fixed NT colours", async () => {
  const source = await sharp({ create: { width: 40, height: 20, channels: 4, background: "#fa6437" } })
    .png().toBuffer();
  const png = await styliseFavicon(source);
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  expect([info.width, info.height, info.channels]).toEqual([16, 16, 4]);
  expect(data[3]).toBe(0);
  const centre = (8 * 16 + 8) * 4;
  expect([...data.subarray(centre, centre + 4)]).toEqual([248, 96, 55, 255]);
  expect(await styliseFavicon(source)).toEqual(png);
});

test("a local-only destination gets a complete pixel icon without a lookup", async () => {
  const first = faviconForHost("localhost");
  expect(faviconForHost("localhost")).toBe(first);
  const { width, height, format } = await sharp(await first).metadata();
  expect([width, height, format]).toEqual([16, 16, "png"]);
});
