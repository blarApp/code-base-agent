from dataclasses import dataclass
from blarify.graph.graph import Graph
from blarify.graph.external_relationship_store import ExternalRelationshipStore
from typing import List


@dataclass
class GraphUpdate:
    graph: Graph
    external_relationship_store: ExternalRelationshipStore

    def get_nodes_as_objects(self) -> List[dict]:
        return self.graph.get_nodes_as_objects()

    def get_relationships_as_objects(self) -> List[dict]:
        return (
            self.graph.get_relationships_as_objects() + self.external_relationship_store.get_relationships_as_objects()
        )
