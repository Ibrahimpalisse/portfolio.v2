import type { ProjectItem } from "@/components/sections/project-modal";

export type ProjectCategoryKey = "personal";

export type ProjectCatalogItem = {
  id: string;
  categoryKey: ProjectCategoryKey;
  tags: string[];
  images: { src: string; labelKey: string }[];
  link?: string;
};

/** Structure des projets — textes dans messages/projects.items.* */
export const projectCatalog: ProjectCatalogItem[] = [
  {
    id: "nova",
    categoryKey: "personal",
    tags: ["Next.js", "Dashboard", "TypeScript"],
    images: [
      { src: "/projects/nova.svg", labelKey: "home" },
      { src: "/projects/nova-dashboard.svg", labelKey: "dashboard" },
      { src: "/projects/nova-mobile.svg", labelKey: "mobile" },
    ],
  },
  {
    id: "maison-belle",
    categoryKey: "personal",
    tags: ["E-commerce", "UI/UX", "Responsive"],
    images: [
      { src: "/projects/maison-belle.svg", labelKey: "shop" },
      { src: "/projects/maison-belle-product.svg", labelKey: "product" },
    ],
  },
  {
    id: "atelier-lumiere",
    categoryKey: "personal",
    tags: ["Vitrine", "Galerie", "Design"],
    images: [
      { src: "/projects/atelier-lumiere.svg", labelKey: "home" },
      { src: "/projects/atelier-lumiere-gallery.svg", labelKey: "gallery" },
    ],
  },
  {
    id: "fitpro",
    categoryKey: "personal",
    tags: ["App web", "Landing", "Mobile-first"],
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
  return [...new Set(projectCatalog.map((project) => project.categoryKey))];
}

/** @deprecated Utiliser useLocalizedProjects() côté client. */
export const projects: ProjectItem[] = projectCatalog.map((project) => ({
  id: project.id,
  title: project.id,
  category: project.categoryKey,
  desc: "",
  tags: project.tags,
  images: project.images.map((image) => ({ src: image.src, label: image.labelKey })),
  link: project.link,
}));

export function getProjectCategories() {
  return getProjectCategoryKeys();
}
