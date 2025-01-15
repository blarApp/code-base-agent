from blarify.graph.relationship.relationship_type import RelationshipType


class ExternalRelationship:
    def __init__(self, start_node_id: str, end_node_id: str, rel_type: "RelationshipType"):
        self.source = start_node_id
        self.target = end_node_id
        self.type = rel_type

    def as_object(self) -> dict:
        return {
            "sourceId": self.source,
            "targetId": self.target,
            "type": self.type.name,
            "scopeText": "",
        }
