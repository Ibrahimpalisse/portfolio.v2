import {
  DockerIcon,
  FramerIcon,
  GitIcon,
  MongoIcon,
  NextJsIcon,
  NodeIcon,
  PostgresIcon,
  ReactIcon,
  TailwindIcon,
  TypeScriptIcon,
} from "@/components/ui/tech-icons";

const technologies = [
  { name: "Next.js", Icon: NextJsIcon },
  { name: "React", Icon: ReactIcon },
  { name: "TypeScript", Icon: TypeScriptIcon },
  { name: "Tailwind CSS", Icon: TailwindIcon },
  { name: "Node.js", Icon: NodeIcon },
  { name: "PostgreSQL", Icon: PostgresIcon },
  { name: "MongoDB", Icon: MongoIcon },
  { name: "Docker", Icon: DockerIcon },
  { name: "Git", Icon: GitIcon },
  { name: "Framer Motion", Icon: FramerIcon },
];

export function TechStrip() {
  return (
    <div className="relative z-10 border-t border-step-accent/15 bg-step-surface/70 py-5 sm:py-6">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-5 gap-y-3 px-4 sm:gap-x-7">
        {technologies.map(({ name, Icon }) => (
          <div
            key={name}
            className="flex items-center gap-2 text-foreground/50"
            title={name}
          >
            <Icon className="h-4 w-4 shrink-0 opacity-80" />
            <span className="text-xs font-medium sm:text-sm">{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
