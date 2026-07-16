import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { isPublished } from "../lib/blog";

export async function GET(context: { site: URL | undefined }) {
  const posts = (await getCollection("blog"))
    .filter((post) => isPublished(post.data.draft))
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

  return rss({
    title: "HuntMode Blog",
    description: "Job search intel, tips, product updates, and guest voices.",
    site: context.site ?? "https://www.huntmode.ca",
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/blog/${post.id.replace(/\.md$/, "")}/`,
      categories: [post.data.category, ...post.data.tags],
    })),
  });
}
