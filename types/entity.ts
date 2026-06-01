export type Cardinality = "one" | "many";

export interface EntityProperty {
  name: string;
  type: string;
  nullable: boolean;
  isKey: boolean;
}

export interface Relationship {
  name: string;
  target: string;
  cardinality: Cardinality;
}

export interface Entity {
  id: string;
  name: string;
  namespace?: string;
  properties: EntityProperty[];
  relationships: Relationship[];
}
