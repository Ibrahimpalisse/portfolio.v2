import type { ProjectItem } from "@/components/sections/project-modal";

export type ProjectCategoryKey = "personal" | "sold";

export type ProjectCatalogItem = {
  id: string;
  categoryKey: ProjectCategoryKey;
  businessTypeIds: string[];
  images: { src: string; labelKey: string }[];
  link?: string;
};

/** Structure des projets démo — textes dans messages/projects.items.* */
export const projectCatalog: ProjectCatalogItem[] = [
  {
    id: "nova",
    categoryKey: "personal",
    businessTypeIds: ["dashboard", "webapp"],
    images: [
      { src: "/projects/nova.svg", labelKey: "home" },
      { src: "/projects/nova-dashboard.svg", labelKey: "dashboard" },
      { src: "/projects/nova-mobile.svg", labelKey: "mobile" },
    ],
  },
  {
    id: "maison-belle",
    categoryKey: "personal",
    businessTypeIds: ["ecommerce"],
    images: [
      { src: "/projects/maison-belle.svg", labelKey: "shop" },
      { src: "/projects/maison-belle-product.svg", labelKey: "product" },
    ],
  },
  {
    id: "atelier-lumiere",
    categoryKey: "personal",
    businessTypeIds: ["showcase"],
    images: [
      { src: "/projects/atelier-lumiere.svg", labelKey: "home" },
      { src: "/projects/atelier-lumiere-gallery.svg", labelKey: "gallery" },
    ],
  },
  {
    id: "fitpro",
    categoryKey: "personal",
    businessTypeIds: ["landing", "booking", "webapp"],
    images: [
      { src: "/projects/fitpro.svg", labelKey: "landing" },
      { src: "/projects/fitpro-app.svg", labelKey: "member" },
    ],
  },
];

export type LocalizedProjectItem = ProjectItem & {
  categoryKey: ProjectCategoryKey;
};

export function getProjectCategoryKeys(): ProjectCategoryKey[] {
  return ["personal", "sold"];
}

/** @deprecated Utiliser useLocalizedProjects() / getSiteProjects(). */
export const projects: ProjectItem[] = projectCatalog.map((project) => ({
  id: project.id,
  title: project.id,
  category: project.categoryKey,
  desc: "",
  tags: [],
  businessTypeIds: project.businessTypeIds,
  images: project.images.map((image) => ({
    src: image.src,
    label: image.labelKey,
  })),
  link: project.link,
}));

export function getProjectCategories() {
  return getProjectCategoryKeys();
}
