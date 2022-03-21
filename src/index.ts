import { locate } from "@iconify/json";
import { IconifyJSON } from "@iconify/types";
import { defaultCustomisations, getIconData, iconToSVG } from "@iconify/utils";
import { readFileSync } from "fs";
import { Declaration, PluginCreator } from "postcss";

const icons: { [name: string]: Declaration[] | undefined } =
  Object.create(null);
const collections: { [collection: string]: IconifyJSON | undefined } =
  Object.create(null);

export type PostcssIconifyOptions = {
  scale?: number;
  properties?: { [name: string]: string };
};

const postcssIconify: PluginCreator<PostcssIconifyOptions> = (opts) => {
  const { scale = 1, properties = {} } = opts ?? {};
  const getIconDeclarations = (value: string) => {
    if (!icons[value]) {
      const parts = value.split("-");
      let collection = "";
      let name = "";
      let iconSet: IconifyJSON | undefined;
      for (let i = parts.length - 1; i; i--) {
        collection = parts.slice(0, i).join("-");
        name = parts.slice(i).join("-");
        try {
          iconSet = collections[collection] ??= JSON.parse(
            readFileSync(locate(collection), "utf8")
          );
          break;
        } catch {}
      }
      if (!iconSet) {
        throw new Error(`Not found collection ${collection}.`);
      }
      const iconData = getIconData(iconSet, name, true);
      if (!iconData) {
        throw new Error(`Not found icon ${value}.`);
      }
      const { attributes, body } = iconToSVG(iconData, {
        ...defaultCustomisations,
        height: `${scale}em`,
        width: `${scale}em`,
      });
      const svg = body.includes("xlink:")
        ? `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ${Object.entries(
            attributes
          )
            .map((i) => `${i[0]}="${i[1]}"`)
            .join(" ")}>${body}</svg>`
        : `<svg ${Object.entries(attributes)
            .map((i) => `${i[0]}="${i[1]}"`)
            .join(" ")}>${body}</svg>`;
      const url = `url("data:image/svg+xml;utf8,${svg
        .replace(
          "<svg",
          svg.includes("xmlns")
            ? "<svg"
            : '<svg xmlns="http://www.w3.org/2000/svg"'
        )
        .replace(/"/g, "'")
        .replace(/%/g, "%25")
        .replace(/#/g, "%23")
        .replace(/{/g, "%7B")
        .replace(/}/g, "%7D")
        .replace(/</g, "%3C")
        .replace(/>/g, "%3E")}")`;
      const props = svg.includes("currentColor")
        ? {
            "--i": url,
            mask: "var(--i) no-repeat",
            "mask-size": "100% 100%",
            "-webkit-mask": "var(--i) no-repeat",
            "-webkit-mask-size": "100% 100%",
            "background-color": "currentColor",
            height: `${scale}em`,
            width: `${scale}em`,
            ...properties,
          }
        : {
            background: `${url} no-repeat`,
            "background-size": "100% 100%",
            "background-color": "transparent",
            height: `${scale}em`,
            width: `${scale}em`,
            ...properties,
          };

      icons[value] = Object.entries(props).map(
        ([prop, value]) => new Declaration({ prop, value })
      );
    }
    return icons[value]!.map((declaration) => declaration.clone());
  };
  return {
    postcssPlugin: "postcss-iconify",
    Declaration: {
      "--icon"(decl) {
        decl.replaceWith(getIconDeclarations(decl.value));
      },
    },
  };
};

postcssIconify.postcss = true;

export default postcssIconify;
