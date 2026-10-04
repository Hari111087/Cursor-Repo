import sanitizeHtml from "sanitize-html";

/** Strict sanitizer for untrusted email HTML. Scripts, forms, iframes, styles-with-urls and event handlers are stripped. */
export function sanitizeEmailHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "a", "b", "i", "u", "em", "strong", "p", "br", "div", "span", "ul", "ol", "li",
      "blockquote", "pre", "code", "h1", "h2", "h3", "h4", "h5", "h6", "hr",
      "table", "thead", "tbody", "tfoot", "tr", "td", "th", "img", "small", "sup", "sub",
    ],
    allowedAttributes: {
      a: ["href", "title"],
      img: ["src", "alt", "width", "height"],
      td: ["colspan", "rowspan", "align"],
      th: ["colspan", "rowspan", "align"],
      "*": ["style"],
    },
    allowedSchemes: ["https", "mailto"],
    allowedSchemesByTag: { img: ["https", "data"] },
    allowedStyles: {
      "*": {
        color: [/^#[0-9a-f]{3,8}$/i, /^rgb\(/i, /^[a-z]+$/i],
        "text-align": [/^(left|right|center|justify)$/],
        "font-weight": [/^\w+$/],
        "font-style": [/^\w+$/],
      },
    },
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer nofollow" },
      }),
    },
    disallowedTagsMode: "discard",
  });
}

/** Plain-text sanitizer for anything that gets placed into prompts or UI as text. */
export function toPlainText(input: string, max = 20_000): string {
  return sanitizeHtml(input, { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}
