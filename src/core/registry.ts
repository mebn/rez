import type { EdgeComponent, FloorComponent, ObjectComponent, WorldComponent } from "./types";

/**
 * Central catalogue of every placeable thing. The game and (later) the world builder only
 * refer to components by id, so new things are added by registering one more component.
 */
class Registry {
  private floors = new Map<string, FloorComponent>();
  private edges = new Map<string, EdgeComponent>();
  private objects = new Map<string, ObjectComponent>();

  register(...components: WorldComponent[]): void {
    for (const c of components) {
      const map = c.kind === "floor" ? this.floors : c.kind === "edge" ? this.edges : this.objects;
      if (map.has(c.id)) throw new Error(`Duplicate component id: ${c.id}`);
      (map as Map<string, WorldComponent>).set(c.id, c);
    }
  }

  floor(id: string): FloorComponent {
    const c = this.floors.get(id);
    if (!c) throw new Error(`Unknown floor component: ${id}`);
    return c;
  }

  edge(id: string): EdgeComponent {
    const c = this.edges.get(id);
    if (!c) throw new Error(`Unknown edge component: ${id}`);
    return c;
  }

  object(id: string): ObjectComponent {
    const c = this.objects.get(id);
    if (!c) throw new Error(`Unknown object component: ${id}`);
    return c;
  }

  /** Everything, for builder palettes. */
  all(): WorldComponent[] {
    return [...this.floors.values(), ...this.edges.values(), ...this.objects.values()];
  }
}

export const registry = new Registry();
