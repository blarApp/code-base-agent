from typing import List, TYPE_CHECKING

if TYPE_CHECKING:
    from Graph.Relationship import Relationship
    from Graph.Node import NodeLabels


class Node:
    label: "NodeLabels"
    path: str

    def __init__(self, label: "NodeLabels", path: str):
        self.label = label
        self.path = path

        if not self.is_path_format_valid():
            raise ValueError(f"Path format is not valid: {self.path}")

    def is_path_format_valid(self):
        return self.path.startswith("file://")

    @property
    def id(self):
        return self.__str__()

    @property
    def pure_path(self):
        return self.path.replace("file://", "")

    def as_object(self):
        return {
            "node_id": self.id,
            "type": self.label.name,
            "attributes": {
                "label": self.label.name,
                "path": self.path,
                "node_id": self.id,
            },
        }

    def get_relationships(self) -> List["Relationship"]:
        return []

    def __str__(self):
        return f"{self.label}({self.path})"
